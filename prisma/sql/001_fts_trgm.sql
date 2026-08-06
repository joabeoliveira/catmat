CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

ALTER TABLE "CatmatItem"
  ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nomePdm", ''))), 'A') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("descricaoItem", ''))), 'B') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nomeClasse", '') || ' ' || coalesce("nomeGrupo", ''))), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS catmat_tsv_idx ON "CatmatItem" USING GIN (tsv);
CREATE INDEX IF NOT EXISTS catmat_pdm_trgm_idx ON "CatmatItem" USING GIN (immutable_unaccent("nomePdm") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS catmat_desc_trgm_idx ON "CatmatItem" USING GIN (immutable_unaccent("descricaoItem") gin_trgm_ops);
