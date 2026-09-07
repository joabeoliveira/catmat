CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number text NOT NULL,
  description text NOT NULL,
  supplier_name text NOT NULL,
  supplier_document text,
  initial_value double precision NOT NULL,
  current_value double precision NOT NULL,
  index_name text NOT NULL,
  base_date_type text NOT NULL CHECK (base_date_type IN ('BUDGET_DATE', 'PROPOSAL_DATE')),
  base_date date NOT NULL,
  next_adjustment date NOT NULL,
  start_date date,
  end_date date,
  uasg_code text,
  organ_name text,
  source text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  reference_date date NOT NULL,
  applied_index double precision NOT NULL,
  initial_index double precision NOT NULL,
  factor double precision NOT NULL,
  old_value double precision NOT NULL,
  new_value double precision NOT NULL,
  retroactive_val double precision,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'WAIVED')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS economic_indexes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  series_code text NOT NULL,
  date date NOT NULL,
  value double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, date)
);

CREATE INDEX IF NOT EXISTS contracts_next_adjustment_idx ON contracts(next_adjustment);
CREATE INDEX IF NOT EXISTS adjustments_contract_reference_idx ON adjustments(contract_id, reference_date);
