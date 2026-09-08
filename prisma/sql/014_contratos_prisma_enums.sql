-- Compatibilidade dos enums usados pelo Prisma no módulo de contratos.
-- Seguro para executar mais de uma vez.

DO $$
BEGIN
  CREATE TYPE public."BaseDateType" AS ENUM ('BUDGET_DATE', 'PROPOSAL_DATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."AdjustmentStatus" AS ENUM ('PENDING', 'APPLIED', 'WAIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.contracts
  ALTER COLUMN base_date_type DROP DEFAULT,
  ALTER COLUMN base_date_type TYPE public."BaseDateType"
    USING base_date_type::text::public."BaseDateType",
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public."ContractStatus"
    USING status::text::public."ContractStatus",
  ALTER COLUMN status SET DEFAULT 'ACTIVE'::public."ContractStatus";

ALTER TABLE public.adjustments
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public."AdjustmentStatus"
    USING status::text::public."AdjustmentStatus",
  ALTER COLUMN status SET DEFAULT 'PENDING'::public."AdjustmentStatus";
