-- prisma/sql/005_salarios_referencia.sql
-- Tabela + busca para SalarioCbo (salários por CBO/UF, base anual 2023..2026)
-- Execute com: npm run db:salarios-setup  (ou psql "$DATABASE_URL" -f prisma/sql/005_salarios_referencia.sql)
-- O script de import (scripts/import-salarios.mjs) também executa este arquivo (ensureSchema).

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Função imutável de remoção de acentos (padrão do projeto — idempotente)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Tabela (espelha o model SalarioCbo do schema.prisma)
CREATE TABLE IF NOT EXISTS "SalarioCbo" (
  "id"          SERIAL PRIMARY KEY,
  "uf"          CHAR(2) NOT NULL,
  "estado"      TEXT NOT NULL,
  "cbo"         INTEGER NOT NULL,
  "titulo"      TEXT NOT NULL,
  "salario2023" DOUBLE PRECISION,
  "salario2024" DOUBLE PRECISION,
  "salario2025" DOUBLE PRECISION,
    "salario2026" DOUBLE PRECISION
);

ALTER TABLE "SalarioCbo"
  ADD COLUMN IF NOT EXISTS "grandeGrupoCodigo" TEXT,
  ADD COLUMN IF NOT EXISTS "grandeGrupoTitulo" TEXT,
  ADD COLUMN IF NOT EXISTS "subgrupoPrincipalCodigo" TEXT,
  ADD COLUMN IF NOT EXISTS "subgrupoPrincipalTitulo" TEXT,
  ADD COLUMN IF NOT EXISTS "familiaCodigo" TEXT,
  ADD COLUMN IF NOT EXISTS "familiaTitulo" TEXT,
  ADD COLUMN IF NOT EXISTS "perfilOcupacional" TEXT,
  ADD COLUMN IF NOT EXISTS "fonte" TEXT,
  ADD COLUMN IF NOT EXISTS "atualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS "SalarioCboHistorico" (
  "id" SERIAL PRIMARY KEY,
  "cbo" INTEGER NOT NULL,
  "uf" CHAR(2) NOT NULL,
  "ano" INTEGER NOT NULL,
  "salario" DOUBLE PRECISION NOT NULL,
  "fonte" TEXT,
  "carregadoEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "SalarioCboHistorico_uf_cbo_ano_key" UNIQUE ("uf", "cbo", "ano")
);

CREATE TABLE IF NOT EXISTS "SalarioCboPercentil" (
  "id" SERIAL PRIMARY KEY,
  "cbo" INTEGER NOT NULL,
  "ano" INTEGER NOT NULL,
  "observacoes" INTEGER NOT NULL,
  "p10" DOUBLE PRECISION,
  "p25" DOUBLE PRECISION,
  "p50" DOUBLE PRECISION,
  "p75" DOUBLE PRECISION,
  "p90" DOUBLE PRECISION,
  "media" DOUBLE PRECISION,
  "minimo" DOUBLE PRECISION,
  "maximo" DOUBLE PRECISION,
  "fonte" TEXT,
  "calculadoEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "SalarioCboPercentil_cbo_ano_key" UNIQUE ("cbo", "ano")
);

CREATE TABLE IF NOT EXISTS "SalarioCboSinonimo" (
  "id" SERIAL PRIMARY KEY,
  "cbo" INTEGER NOT NULL,
  "sinonimo" TEXT NOT NULL,
  "sinonimoNormalizado" TEXT NOT NULL,
  "fonte" TEXT,
  CONSTRAINT "SalarioCboSinonimo_cbo_sinonimoNormalizado_key" UNIQUE ("cbo", "sinonimoNormalizado")
);

CREATE INDEX IF NOT EXISTS salario_historico_cbo_ano_idx ON "SalarioCboHistorico" ("cbo", "ano");
CREATE INDEX IF NOT EXISTS salario_historico_uf_ano_idx ON "SalarioCboHistorico" ("uf", "ano");
CREATE INDEX IF NOT EXISTS salario_percentil_ano_idx ON "SalarioCboPercentil" ("ano");
CREATE INDEX IF NOT EXISTS salario_sinonimo_normalizado_idx ON "SalarioCboSinonimo" ("sinonimoNormalizado");
CREATE INDEX IF NOT EXISTS salario_hierarquia_idx ON "SalarioCbo" ("familiaCodigo", "subgrupoPrincipalCodigo", "grandeGrupoCodigo");

-- Coluna de busca gerada (pesos: titulo=A, cbo=B)
ALTER TABLE "SalarioCbo"
  ADD COLUMN IF NOT EXISTS busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("titulo", ''))), 'A') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce(cast("cbo" as text), ''))), 'B')
  ) STORED;

-- Chave única / índices de busca e filtragem
CREATE UNIQUE INDEX IF NOT EXISTS "SalarioCbo_uf_cbo_key"
  ON "SalarioCbo" ("uf", "cbo");

CREATE INDEX IF NOT EXISTS salario_cbo_idx
  ON "SalarioCbo" ("cbo");

-- Ocupações detalhadas da CBO (6 dígitos), relacionadas à família salarial (4 dígitos).
CREATE TABLE IF NOT EXISTS "SalarioCboOcupacao" (
  "cbo" INTEGER PRIMARY KEY,
  "familiaCbo" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL,
  "perfilOcupacional" TEXT,
  "fonte" TEXT,
  "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS salario_ocupacao_familia_idx ON "SalarioCboOcupacao" ("familiaCbo");
CREATE INDEX IF NOT EXISTS salario_ocupacao_titulo_idx ON "SalarioCboOcupacao" USING gin (to_tsvector('portuguese', immutable_unaccent("titulo")));

ALTER TABLE "SalarioCboSinonimo" ADD COLUMN IF NOT EXISTS "ocupacaoCbo" INTEGER;
CREATE INDEX IF NOT EXISTS salario_sinonimo_ocupacao_idx ON "SalarioCboSinonimo" ("ocupacaoCbo");

CREATE INDEX IF NOT EXISTS salario_uf_idx
  ON "SalarioCbo" ("uf");

CREATE INDEX IF NOT EXISTS salario_titulo_trgm_idx
  ON "SalarioCbo" USING gin (immutable_unaccent("titulo") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS salario_busca_tsv_idx
  ON "SalarioCbo" USING gin ("busca_tsv");
