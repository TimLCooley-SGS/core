-- Seed: Default roles created when an org is provisioned.
-- Orgs can rename these, add new roles, or remove non-system roles.

INSERT INTO roles (name, description, is_system) VALUES
  ('Org Admin', 'Full access to all org features and settings. Cannot be deleted.', true),
  ('Manager', 'Access to most features. Cannot manage billing or org settings.', false),
  ('Front Desk', 'Day-to-day operations: check-ins, memberships, basic people management.', false),
  ('Volunteer', 'Limited read access for volunteer-level tasks.', false);

-- Org Admin gets all capabilities
INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Org Admin';

-- Manager gets most capabilities except settings.manage, billing.manage, roles.manage, staff.manage
INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Manager'
  AND c.key NOT IN (
    'settings.manage',
    'billing.manage',
    'billing.read',
    'roles.manage',
    'roles.create',
    'roles.delete',
    'staff.manage',
    'staff.delete'
  );

-- Front Desk gets operational capabilities
INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Front Desk'
  AND c.key IN (
    'tickets.create', 'tickets.read', 'tickets.update',
    'members.read', 'members.update',
    'people.read', 'people.update',
    'households.read',
    'visits.create', 'visits.read',
    'donations.read'
  );

-- Volunteer gets read-only access
INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Volunteer'
  AND c.key IN (
    'tickets.read',
    'members.read',
    'people.read',
    'visits.read'
  );
