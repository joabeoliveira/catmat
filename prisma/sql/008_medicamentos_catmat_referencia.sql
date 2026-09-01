-- Tabela de medicamentos CATMAT e indices de pesquisa.
-- O importador scripts/import-medicamentos.mjs tambem executa este arquivo.

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

CREATE TABLE IF NOT EXISTS "MedicamentoCatmat" (
  "id" SERIAL PRIMARY KEY,
  "codigoBr" VARCHAR(20) NOT NULL,
  "catmat" VARCHAR(30) NOT NULL,
  "principioAtivo" TEXT NOT NULL,
  "concentracao" TEXT NOT NULL,
  "formaFarmaceutica" TEXT NOT NULL,
  "unidadeFornecimento" TEXT NOT NULL,
  "importadoEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "atualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "busca_tsv" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("principioAtivo", ''))), 'A') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("concentracao", ''))), 'B') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("formaFarmaceutica", ''))), 'B') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("unidadeFornecimento", ''))), 'C') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce("codigoBr", '') || ' ' || coalesce("catmat"::text, ''))), 'A')
  ) STORED
);

-- Compatibilidade com a primeira versão da tabela, que tratava codigoBr
-- como único e catmat como inteiro.
DROP INDEX IF EXISTS medicamentos_catmat_codigo_br_uidx;
ALTER TABLE "MedicamentoCatmat"
  ALTER COLUMN "catmat" TYPE VARCHAR(30) USING "catmat"::text;

CREATE UNIQUE INDEX IF NOT EXISTS medicamentos_catmat_dados_uidx
  ON "MedicamentoCatmat" (
    "codigoBr", "catmat", "principioAtivo", "concentracao",
    "formaFarmaceutica", "unidadeFornecimento"
  );

CREATE INDEX IF NOT EXISTS medicamentos_catmat_catmat_idx
  ON "MedicamentoCatmat" ("catmat");

CREATE INDEX IF NOT EXISTS medicamentos_catmat_busca_tsv_idx
  ON "MedicamentoCatmat" USING gin ("busca_tsv");

CREATE INDEX IF NOT EXISTS medicamentos_catmat_principio_trgm_idx
  ON "MedicamentoCatmat" USING gin (immutable_unaccent("principioAtivo") gin_trgm_ops);
