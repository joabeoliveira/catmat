CREATE TABLE IF NOT EXISTS arp_itens_adesao (
  id text PRIMARY KEY,
  numero_controle_pncp_ata text NOT NULL,
  numero_ata_registro_preco text,
  codigo_unidade_gerenciadora text,
  nome_unidade_gerenciadora text,
  numero_controle_pncp_compra text,
  numero_compra text,
  ano_compra text,
  codigo_modalidade_compra text,
  nome_modalidade_compra text,
  data_assinatura date,
  data_vigencia_inicial date,
  data_vigencia_final date,
  numero_item text NOT NULL,
  codigo_item integer,
  descricao_item text,
  tipo_item text,
  classificacao_fornecedor text,
  ni_fornecedor text,
  nome_razao_social_fornecedor text,
  quantidade_homologada_item double precision,
  quantidade_homologada_vencedor double precision,
  quantidade_empenhada double precision,
  valor_unitario double precision,
  valor_total double precision,
  maximo_adesao double precision NOT NULL,
  item_excluido boolean NOT NULL DEFAULT false,
  data_hora_inclusao timestamptz,
  data_hora_atualizacao timestamptz,
  sincronizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT arp_itens_adesao_controle_item_key UNIQUE (numero_controle_pncp_ata, numero_item)
);
CREATE INDEX IF NOT EXISTS arp_itens_adesao_codigo_item_idx ON arp_itens_adesao (codigo_item);
CREATE INDEX IF NOT EXISTS arp_itens_adesao_uasg_idx ON arp_itens_adesao (codigo_unidade_gerenciadora);
CREATE INDEX IF NOT EXISTS arp_itens_adesao_vigencia_idx ON arp_itens_adesao (data_vigencia_final);
CREATE INDEX IF NOT EXISTS arp_itens_adesao_maximo_idx ON arp_itens_adesao (maximo_adesao);
