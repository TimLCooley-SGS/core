-- Control Plane Migration 005: SGS Staff
-- Internal SGS platform staff records.

CREATE TABLE sgs_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_identity_id uuid NOT NULL REFERENCES global_identities(id),
  role sgs_staff_role NOT NULL,
  status sgs_staff_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_sgs_staff_identity UNIQUE (global_identity_id)
);

CREATE INDEX idx_sgs_staff_status ON sgs_staff (status) WHERE status = 'active';

CREATE TRIGGER trg_sgs_staff_updated_at
  BEFORE UPDATE ON sgs_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
