-- Control Plane Migration 007: Platform Audit Log
-- Append-only log of all platform-level actions. Immutable by design.

CREATE TABLE platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,                      -- global_identity or sgs_staff ID
  action text NOT NULL,               -- e.g., org.created, impersonation.started
  resource_type text,
  resource_id uuid,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Immutable: no updates or deletes allowed
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'platform_audit_log is append-only: % operations are not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platform_audit_log_immutable
  BEFORE UPDATE OR DELETE ON platform_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Indexes for querying
CREATE INDEX idx_platform_audit_log_actor ON platform_audit_log (actor_id);
CREATE INDEX idx_platform_audit_log_action ON platform_audit_log (action);
CREATE INDEX idx_platform_audit_log_resource ON platform_audit_log (resource_type, resource_id);
CREATE INDEX idx_platform_audit_log_created ON platform_audit_log (created_at);
