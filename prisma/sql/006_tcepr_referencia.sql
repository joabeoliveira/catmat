-- prisma/sql/006_tcepr_referencia.sql
-- Tabela + busca para LicitacaoVencedorTcePr (licitações municipais homologadas no TCE-PR)
-- Execute com: npm run db:tcepr-setup  (ou psql "$DATABASE_URL" -f prisma/sql/006_tcepr_referencia.sql)
-- O script de import (scripts/import-tcepr.mjs) também executa este arquivo (ensureSchema).

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Função imutável de remoção de acentos (padrão do projeto — idempotente)
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Tabela (espelha o model LicitacaoVencedorTcePr do schema.prisma)
CREATE TABLE IF NOT EXISTS "LicitacaoVencedorTcePr" (
  "id" SERIAL PRIMARY KEY,
  "cdIbge" VARCHAR(10),
  "nmMunicipio" TEXT NOT NULL,
  "idPessoa" INTEGER,
  "nmEntidade" TEXT NOT NULL,
  "idLicitacao" INTEGER NOT NULL,
  "nrAnoLicitacao" INTEGER NOT NULL,
  "nrLicitacao" INTEGER NOT NULL,
  "dsModalidadeLicitacao" TEXT NOT NULL,
  "dtHomologacao" TIMESTAMPTZ,
  "nrDocumento" VARCHAR(20) NOT NULL,
  "nmPessoa" TEXT NOT NULL,
  "nrLote" INTEGER NOT NULL DEFAULT 1,
  "nrItem" INTEGER NOT NULL,
  "dsItem" TEXT NOT NULL,
  "idUnidadeMedida" INTEGER,
  "dsUnidadeMedida" TEXT,
  "nrQuantidade" DOUBLE PRECISION,
  "vlMinimoUnitarioItem" DOUBLE PRECISION,
  "vlMinimoTotal" DOUBLE PRECISION,
  "vlMaximoUnitarioItem" DOUBLE PRECISION,
  "vlMaximoTotal" DOUBLE PRECISION,
  "nrQuantidadeProposta" DOUBLE PRECISION,
  "vlPropostaItem" DOUBLE PRECISION,
  "nrQuantidadeVencedor" DOUBLE PRECISION,
  "vlLicitacaoVencedor" DOUBLE PRECISION,
  "nrClassificacao" INTEGER NOT NULL,
  "dsFormaPagamento" TEXT,
  "nrPrazoLimiteEntrega" INTEGER,
  "idTipoEntregaProduto" INTEGER,
  "dsTipoEntregaProduto" TEXT,
  "dtValidadeProposta" TIMESTAMPTZ,
  "dtPrazoEntregaProposta" TIMESTAMPTZ,
  "ultimoEnvioSimam" TEXT,
  "dataReferencia" TEXT,
  "importadoEm" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coluna de busca gerada (pesos: dsItem=A, nmMunicipio=B, demais=C)
ALTER TABLE "LicitacaoVencedorTcePr"
  ADD COLUMN IF NOT EXISTS busca_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("dsItem", ''))), 'A') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nmMunicipio", ''))), 'B') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nmEntidade", ''))), 'C') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("nmPessoa", ''))), 'C') ||
    setweight(to_tsvector('portuguese', immutable_unaccent(coalesce("dsModalidadeLicitacao", ''))), 'C')
  ) STORED;

-- Chave única / índices de busca e filtragem
CREATE UNIQUE INDEX IF NOT EXISTS tcepr_item_fornecedor_classificacao_uidx
  ON "LicitacaoVencedorTcePr" ("idLicitacao", "nrLote", "nrItem", "nrDocumento", "nrClassificacao");

CREATE INDEX IF NOT EXISTS tcepr_busca_tsv_idx
  ON "LicitacaoVencedorTcePr" USING gin ("busca_tsv");

CREATE INDEX IF NOT EXISTS tcepr_ds_item_trgm_idx
  ON "LicitacaoVencedorTcePr" USING gin (immutable_unaccent("dsItem") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS tcepr_ibge_ano_idx
  ON "LicitacaoVencedorTcePr" ("cdIbge", "nrAnoLicitacao");

CREATE INDEX IF NOT EXISTS tcepr_nr_documento_idx
  ON "LicitacaoVencedorTcePr" ("nrDocumento");

CREATE INDEX IF NOT EXISTS tcepr_dt_homologacao_idx
  ON "LicitacaoVencedorTcePr" ("dtHomologacao" DESC);

CREATE INDEX IF NOT EXISTS tcepr_id_licitacao_idx
  ON "LicitacaoVencedorTcePr" ("idLicitacao");

CREATE INDEX IF NOT EXISTS tcepr_modalidade_idx
  ON "LicitacaoVencedorTcePr" ("dsModalidadeLicitacao");
