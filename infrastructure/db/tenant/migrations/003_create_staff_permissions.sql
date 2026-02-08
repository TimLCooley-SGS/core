-- Tenant Migration 003: Staff & Permissions
-- Roles are org-customizable labels. Capabilities are SGS-defined resource+action pairs.
-- Role_capabilities is the checkbox grid. Overrides allow per-user grants/revocations.

-- Roles: org-defined labels
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,   -- System roles can't be deleted
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Capabilities: SGS-defined resource+action matrix
CREATE TABLE capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,               -- e.g., "tickets", "members", "donations"
  action text NOT NULL,                 -- e.g., "create", "read", "update", "delete", "manage"
  key text NOT NULL UNIQUE,             -- Auto-composed: "{resource}.{action}"
  description text,                     -- Human-readable label
  category text,                        -- UI grouping
  sort_order integer NOT NULL DEFAULT 0,

  CONSTRAINT uq_capabilities_resource_action UNIQUE (resource, action)
);

CREATE INDEX idx_capabilities_category ON capabilities (category, sort_order);

-- Role-Capability mapping (the checkbox grid)
CREATE TABLE role_capabilities (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, capability_id)
);

-- Staff assignments: links a person to a role
CREATE TABLE staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES persons(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  status staff_assignment_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_assignments_person ON staff_assignments (person_id);
CREATE INDEX idx_staff_assignments_role ON staff_assignments (role_id);
CREATE INDEX idx_staff_assignments_active ON staff_assignments (person_id, status) WHERE status = 'active';

CREATE TRIGGER trg_staff_assignments_updated_at
  BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Staff capability overrides: per-user grants/revocations on top of role
CREATE TABLE staff_capability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_assignment_id uuid NOT NULL REFERENCES staff_assignments(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES capabilities(id),
  override_type override_type NOT NULL,
  granted_by uuid REFERENCES persons(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Only one override per capability per assignment
  CONSTRAINT uq_override_per_capability UNIQUE (staff_assignment_id, capability_id)
);

CREATE INDEX idx_staff_overrides_assignment ON staff_capability_overrides (staff_assignment_id);
