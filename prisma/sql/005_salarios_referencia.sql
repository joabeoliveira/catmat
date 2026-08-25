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

CREATE INDEX IF NOT EXISTS salario_uf_idx
  ON "SalarioCbo" ("uf");

CREATE INDEX IF NOT EXISTS salario_titulo_trgm_idx
  ON "SalarioCbo" USING gin (immutable_unaccent("titulo") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS salario_busca_tsv_idx
  ON "SalarioCbo" USING gin ("busca_tsv");
