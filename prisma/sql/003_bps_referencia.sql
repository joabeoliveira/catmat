CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS bps_itens_referencia (
  id bigserial PRIMARY KEY,
  codigo_compra text NOT NULL,
  codigo_catmat text,
  descricao_catmat text NOT NULL,
  unidade_fornecimento text,
  data_homologacao date,
  modalidade_compra text,
  cnpj_fabricante text,
  fabricante text,
  cnpj_fornecedor text,
  fornecedor text,
  cnpj_comprador text,
  nome_instituicao text,
  uf varchar(2),
  nome_municipio text,
  valor_item_compra numeric(18,4),
  quantidade_item_compra numeric(18,4),
  valor_total_compra numeric(18,4),
  observacoes text,
  seq_compra_item text NOT NULL,
  fonte_arquivo text,
  importado_em timestamp NOT NULL DEFAULT now(),
  busca_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(descricao_catmat, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(unidade_fornecimento, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(fabricante, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(fornecedor, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(nome_instituicao, '')), 'C')
  ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS bps_itens_referencia_seq_uidx
  ON bps_itens_referencia (seq_compra_item);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_busca_tsv_idx
  ON bps_itens_referencia USING gin (busca_tsv);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_descricao_trgm_idx
  ON bps_itens_referencia USING gin (descricao_catmat gin_trgm_ops);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_data_idx
  ON bps_itens_referencia (data_homologacao);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_uf_municipio_idx
  ON bps_itens_referencia (uf, nome_municipio);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_catmat_idx
  ON bps_itens_referencia (codigo_catmat);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_fabricante_idx
  ON bps_itens_referencia (cnpj_fabricante);

CREATE INDEX IF NOT EXISTS bps_itens_referencia_fornecedor_idx
  ON bps_itens_referencia (cnpj_fornecedor);
