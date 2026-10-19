-- Smart Matcher PCA. Idempotente: pode ser executado em banco novo ou existente.
DO $$ BEGIN CREATE TYPE "PcaMatcherJobStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'CONCLUIDO_COM_ERROS', 'ERRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PcaMatcherItemStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'ALTA_CONFIANCA', 'REVISAO', 'SEM_MATCH', 'FORA_ESCOPO', 'ERRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PcaMatcherCatalogType" AS ENUM ('CATMAT', 'CATSER', 'OBRA', 'INDEFINIDO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PcaMatcherCandidateSource" AS ENUM ('LOCAL', 'API', 'IA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "PcaMatcherItemStatus" ADD VALUE IF NOT EXISTS 'MEDIA_CONFIANCA'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "PcaMatcherItemStatus" ADD VALUE IF NOT EXISTS 'BAIXA_CONFIANCA'; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "pca_matcher_jobs" (
  "id" text PRIMARY KEY,
  "status" "PcaMatcherJobStatus" NOT NULL DEFAULT 'PENDENTE',
  "source_file_name" text,
  "source_mime_type" text,
  "object_key" text,
  "hash_sha256" varchar(64) NOT NULL UNIQUE,
  "tamanho_bytes" integer NOT NULL,
  "original_content" bytea,
  "total_itens" integer NOT NULL DEFAULT 0,
  "processados" integer NOT NULL DEFAULT 0,
  "aprovados" integer NOT NULL DEFAULT 0,
  "pendentes" integer NOT NULL DEFAULT 0,
  "erros" integer NOT NULL DEFAULT 0,
  "algoritmo_versao" text NOT NULL DEFAULT 'pca-v1',
  "catalogo_versao" text,
  "erro" text,
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "iniciado_em" timestamptz,
  "concluido_em" timestamptz,
  "atualizado_em" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "pca_matcher_items" (
  "id" text PRIMARY KEY,
  "job_id" text NOT NULL REFERENCES "pca_matcher_jobs"("id") ON DELETE CASCADE,
  "source_sheet" text NOT NULL,
  "source_row" integer NOT NULL,
  "original_row" jsonb NOT NULL,
  "descricao_original" text NOT NULL,
  "descricao_normalizada" text NOT NULL,
  "termo_canonico" text NOT NULL,
  "tipo_catalogo" "PcaMatcherCatalogType" NOT NULL DEFAULT 'INDEFINIDO',
  "unidade" text,
  "quantidade" double precision,
  "classe" text,
  "atributos" jsonb,
  "status" "PcaMatcherItemStatus" NOT NULL DEFAULT 'PENDENTE',
  "codigo_aprovado" integer,
  "erro" text,
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  "atualizado_em" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("job_id", "source_sheet", "source_row")
);

CREATE TABLE IF NOT EXISTS "pca_matcher_candidates" (
  "id" text PRIMARY KEY,
  "item_id" text NOT NULL REFERENCES "pca_matcher_items"("id") ON DELETE CASCADE,
  "tipo_catalogo" "PcaMatcherCatalogType" NOT NULL,
  "codigo" integer NOT NULL,
  "descricao_catalogo" text NOT NULL,
  "posicao" integer NOT NULL,
  "score_textual" double precision NOT NULL,
  "score_atributos" double precision NOT NULL,
  "score_atividade" double precision NOT NULL,
  "score_recencia" double precision NOT NULL,
  "score_final" double precision NOT NULL,
  "evidencias" jsonb,
  "origem" "PcaMatcherCandidateSource" NOT NULL DEFAULT 'LOCAL',
  "criado_em" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("item_id", "tipo_catalogo", "codigo")
);

CREATE TABLE IF NOT EXISTS "pca_matcher_decisions" (
  "id" text PRIMARY KEY,
  "item_id" text NOT NULL UNIQUE REFERENCES "pca_matcher_items"("id") ON DELETE CASCADE,
  "codigo_aprovado" integer,
  "justificativa" text,
  "ator" text,
  "algoritmo_versao" text NOT NULL,
  "criado_em" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "pca_matcher_jobs_status_idx" ON "pca_matcher_jobs" ("status");
CREATE INDEX IF NOT EXISTS "pca_matcher_jobs_hash_idx" ON "pca_matcher_jobs" ("hash_sha256");
CREATE INDEX IF NOT EXISTS "pca_matcher_items_job_status_idx" ON "pca_matcher_items" ("job_id", "status");
CREATE INDEX IF NOT EXISTS "pca_matcher_items_job_term_idx" ON "pca_matcher_items" ("job_id", "termo_canonico");
CREATE INDEX IF NOT EXISTS "pca_matcher_items_type_term_idx" ON "pca_matcher_items" ("tipo_catalogo", "termo_canonico");
CREATE INDEX IF NOT EXISTS "pca_matcher_candidates_item_position_idx" ON "pca_matcher_candidates" ("item_id", "posicao");
CREATE INDEX IF NOT EXISTS "pca_matcher_candidates_type_code_idx" ON "pca_matcher_candidates" ("tipo_catalogo", "codigo");
CREATE INDEX IF NOT EXISTS "pca_matcher_decisions_code_idx" ON "pca_matcher_decisions" ("codigo_aprovado");
