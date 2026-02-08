-- Tenant Migration 002: Persons
-- The central entity in the tenant database. Every patron, staff member, donor,
-- visitor, or contact is a person. A person may or may not have a login.

-- Reusable updated_at trigger for tenant tables
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text,                    -- Computed or overridden
  email text,                           -- Nullable; not unique (kids share parent email)
  phone text,
  date_of_birth date,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  global_identity_id uuid,             -- Nullable; links to control plane auth
  login_enabled boolean NOT NULL DEFAULT false,
  status person_status NOT NULL DEFAULT 'active',
  merged_into_id uuid REFERENCES persons(id),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),

  -- If merged, must point to another person
  CONSTRAINT chk_merged_has_target CHECK (
    (status = 'merged' AND merged_into_id IS NOT NULL) OR
    (status != 'merged' AND merged_into_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_persons_email ON persons (email) WHERE email IS NOT NULL;
CREATE INDEX idx_persons_global_identity ON persons (global_identity_id) WHERE global_identity_id IS NOT NULL;
CREATE INDEX idx_persons_status ON persons (status);
CREATE INDEX idx_persons_name ON persons (last_name, first_name);
CREATE INDEX idx_persons_merged_into ON persons (merged_into_id) WHERE merged_into_id IS NOT NULL;

CREATE TRIGGER trg_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
