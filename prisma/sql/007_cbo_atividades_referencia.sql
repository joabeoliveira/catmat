-- prisma/sql/007_cbo_atividades_referencia.sql
-- Tabela + índices para SalarioCboAtividade (atividades do perfil ocupacional CBO 2002)
-- Execute com: npm run db:cbo-atividades-setup  (ou psql "$DATABASE_URL" -f prisma/sql/007_cbo_atividades_referencia.sql)
-- O script de import (scripts/import-cbo-atividades.mjs) também executa este arquivo (ensureSchema).

CREATE TABLE IF NOT EXISTS "SalarioCboAtividade" (
  "id" SERIAL PRIMARY KEY,
  "cbo" INTEGER NOT NULL,
  "familiaCbo" INTEGER NOT NULL,
  "codigoAtividade" INTEGER NOT NULL,
  "nomeAtividade" TEXT NOT NULL,
  "siglaGrandeArea" TEXT NOT NULL,
  "grandeArea" TEXT NOT NULL,
  "grandeGrupoCodigo" INTEGER NOT NULL,
  "subgrupoPrincipalCodigo" INTEGER NOT NULL,
  "subgrupoCodigo" INTEGER NOT NULL,
  "familiaCodigo" INTEGER NOT NULL,
  "fonte" TEXT,
  "atualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "SalarioCboAtividade_cbo_siglaGrandeArea_codigoAtividade_key"
    UNIQUE ("cbo", "siglaGrandeArea", "codigoAtividade")
);

CREATE INDEX IF NOT EXISTS salario_atividade_cbo_idx
  ON "SalarioCboAtividade" ("cbo");

CREATE INDEX IF NOT EXISTS salario_atividade_familia_idx
  ON "SalarioCboAtividade" ("familiaCbo");

CREATE INDEX IF NOT EXISTS salario_atividade_grande_area_idx
  ON "SalarioCboAtividade" ("grandeArea");
