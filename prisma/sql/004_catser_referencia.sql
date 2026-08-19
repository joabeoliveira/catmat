-- prisma/sql/004_catser_referencia.sql
-- Setup de busca full-text (FTS + trigram) para a tabela CatserItem
-- Execute com: npm run db:catser-setup  (ou psql "$DATABASE_URL" -f prisma/sql/004_catser_referencia.sql)

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Função imutável de remoção de acentos (padrão do projeto — idempotente)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Coluna de busca gerada (pesos: nomeServico=A, nomeClasse+nomeGrupo=B, codigoServico=C)
ALTER TABLE "CatserItem"
  ADD COLUMN IF NOT EXISTS busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nomeServico", ''))), 'A') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nomeClasse", '') || ' ' || coalesce("nomeGrupo", ''))), 'B') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce(cast("codigoServico" as text), ''))), 'C')
  ) STORED;

-- Índices de busca
CREATE INDEX IF NOT EXISTS catser_busca_tsv_idx
  ON "CatserItem" USING gin (busca_tsv);

CREATE INDEX IF NOT EXISTS catser_nome_servico_trgm_idx
  ON "CatserItem" USING gin (immutable_unaccent("nomeServico") gin_trgm_ops);

-- Índices de filtragem
CREATE INDEX IF NOT EXISTS catser_codigo_grupo_idx
  ON "CatserItem" ("codigoGrupo");

CREATE INDEX IF NOT EXISTS catser_codigo_classe_idx
  ON "CatserItem" ("codigoClasse");

CREATE INDEX IF NOT EXISTS catser_codigo_servico_idx
  ON "CatserItem" ("codigoServico");

CREATE INDEX IF NOT EXISTS catser_status_servico_idx
  ON "CatserItem" ("statusServico");
