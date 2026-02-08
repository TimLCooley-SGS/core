-- Control Plane Migration 006: Impersonation Sessions
-- Tracks SGS staff impersonation of org users for support purposes.
-- Every impersonation requires a reason and is fully auditable.

CREATE TABLE impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sgs_staff_id uuid NOT NULL REFERENCES sgs_staff(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  target_person_id uuid NOT NULL,     -- Person ID in tenant DB
  reason text NOT NULL,               -- Required justification
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,               -- NULL = still active
  ip_address inet,
  user_agent text,
  status impersonation_status NOT NULL DEFAULT 'active',

  -- Only one active impersonation per staff member at a time
  CONSTRAINT chk_impersonation_ended CHECK (
    (status = 'active' AND ended_at IS NULL) OR
    (status != 'active' AND ended_at IS NOT NULL)
  )
);

CREATE INDEX idx_impersonation_sessions_staff ON impersonation_sessions (sgs_staff_id);
CREATE INDEX idx_impersonation_sessions_org ON impersonation_sessions (organization_id);
CREATE INDEX idx_impersonation_sessions_active ON impersonation_sessions (sgs_staff_id, status) WHERE status = 'active';

-- Ensure only one active session per staff member
CREATE UNIQUE INDEX uq_impersonation_one_active_per_staff
  ON impersonation_sessions (sgs_staff_id)
  WHERE status = 'active';
