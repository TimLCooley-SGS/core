-- Tenant Migration 008: Tenant Audit Log
-- Append-only, immutable audit trail for all tenant-level operations.

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_person_id uuid REFERENCES persons(id),
  actor_type audit_actor_type NOT NULL,
  impersonation_session_id uuid,        -- Nullable; refs control plane
  impersonated_by_email text,           -- Denormalized for auditability
  action audit_action NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Immutable: no updates or deletes allowed
CREATE OR REPLACE FUNCTION prevent_tenant_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % operations are not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_tenant_audit_log_modification();

-- Indexes for querying
CREATE INDEX idx_audit_log_actor ON audit_log (actor_person_id);
CREATE INDEX idx_audit_log_action ON audit_log (action);
CREATE INDEX idx_audit_log_table ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at);
CREATE INDEX idx_audit_log_impersonation ON audit_log (impersonation_session_id) WHERE impersonation_session_id IS NOT NULL;
