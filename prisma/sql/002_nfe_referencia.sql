CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS nfe_itens_referencia (
  id bigserial PRIMARY KEY,
  chave_acesso varchar(44) NOT NULL,
  modelo text,
  serie text,
  numero text,
  natureza_operacao text,
  data_emissao timestamp,
  cpf_cnpj_emitente text,
  razao_social_emitente text,
  inscricao_estadual_emitente text,
  uf_emitente varchar(2),
  municipio_emitente text,
  codigo_orgao_superior_destinatario text,
  orgao_superior_destinatario text,
  codigo_orgao_destinatario text,
  orgao_destinatario text,
  cnpj_destinatario text,
  nome_destinatario text,
  uf_destinatario varchar(2),
  indicador_ie_destinatario text,
  destino_operacao text,
  consumidor_final text,
  presenca_comprador text,
  numero_produto text NOT NULL,
  descricao_produto_servico text NOT NULL,
  codigo_ncm_sh text,
  ncm_sh text,
  cfop text,
  quantidade numeric(18,4),
  unidade text,
  valor_unitario numeric(18,4),
  valor_total numeric(18,4),
  fonte_arquivo text,
  importado_em timestamp NOT NULL DEFAULT now(),
  busca_tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(descricao_produto_servico, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(ncm_sh, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(razao_social_emitente, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(nome_destinatario, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(orgao_destinatario, '')), 'C')
  ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS nfe_itens_referencia_chave_produto_uidx
  ON nfe_itens_referencia (chave_acesso, numero_produto);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_busca_tsv_idx
  ON nfe_itens_referencia USING gin (busca_tsv);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_descricao_trgm_idx
  ON nfe_itens_referencia USING gin (descricao_produto_servico gin_trgm_ops);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_data_idx
  ON nfe_itens_referencia (data_emissao);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_uf_municipio_idx
  ON nfe_itens_referencia (uf_emitente, municipio_emitente);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_destino_idx
  ON nfe_itens_referencia (uf_destinatario, nome_destinatario);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_ncm_idx
  ON nfe_itens_referencia (codigo_ncm_sh);

CREATE INDEX IF NOT EXISTS nfe_itens_referencia_cfop_idx
  ON nfe_itens_referencia (cfop);
