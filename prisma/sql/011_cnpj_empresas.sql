CREATE TABLE IF NOT EXISTS cnpj_empresas (
  id text PRIMARY KEY,
  cnpj text NOT NULL UNIQUE,
  razao_social text,
  nome_fantasia text,
  situacao_cadastral text,
  data_situacao_cadastral date,
  data_inicio_atividade date,
  natureza_juridica text,
  porte text,
  capital_social double precision,
  cnae_fiscal text,
  cnae_fiscal_descricao text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  municipio text,
  uf text,
  cep text,
  email text,
  telefone text,
  socios jsonb,
  atividades_secundarias jsonb,
  dados_brutos jsonb,
  fonte text DEFAULT 'BrasilAPI',
  consultado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cnpj_empresas_razao_social_idx ON cnpj_empresas (razao_social);
CREATE INDEX IF NOT EXISTS cnpj_empresas_nome_fantasia_idx ON cnpj_empresas (nome_fantasia);
CREATE INDEX IF NOT EXISTS cnpj_empresas_situacao_idx ON cnpj_empresas (situacao_cadastral);
CREATE INDEX IF NOT EXISTS cnpj_empresas_localizacao_idx ON cnpj_empresas (uf, municipio);
