-- Seed: SGS-defined capability matrix
-- These are platform-defined resource+action pairs that orgs assign to roles.
-- Orgs cannot add/remove capabilities — only toggle them per role.

INSERT INTO capabilities (resource, action, key, description, category, sort_order) VALUES
  -- Tickets
  ('tickets', 'create', 'tickets.create', 'Create tickets', 'Tickets', 10),
  ('tickets', 'read',   'tickets.read',   'View tickets', 'Tickets', 20),
  ('tickets', 'update', 'tickets.update', 'Edit tickets', 'Tickets', 30),
  ('tickets', 'delete', 'tickets.delete', 'Delete tickets', 'Tickets', 40),
  ('tickets', 'manage', 'tickets.manage', 'Full ticket management', 'Tickets', 50),

  -- Members
  ('members', 'create', 'members.create', 'Create member records', 'Members', 10),
  ('members', 'read',   'members.read',   'View member records', 'Members', 20),
  ('members', 'update', 'members.update', 'Edit member records', 'Members', 30),
  ('members', 'delete', 'members.delete', 'Delete member records', 'Members', 40),
  ('members', 'manage', 'members.manage', 'Full member management', 'Members', 50),

  -- Donations
  ('donations', 'create', 'donations.create', 'Record donations', 'Donations', 10),
  ('donations', 'read',   'donations.read',   'View donations', 'Donations', 20),
  ('donations', 'update', 'donations.update', 'Edit donations', 'Donations', 30),
  ('donations', 'delete', 'donations.delete', 'Delete donations', 'Donations', 40),
  ('donations', 'manage', 'donations.manage', 'Full donation management', 'Donations', 50),

  -- Reports
  ('reports', 'read',   'reports.read',   'View reports', 'Reports', 10),
  ('reports', 'create', 'reports.create', 'Create custom reports', 'Reports', 20),
  ('reports', 'manage', 'reports.manage', 'Full report management', 'Reports', 30),

  -- People
  ('people', 'create', 'people.create', 'Create person records', 'People', 10),
  ('people', 'read',   'people.read',   'View person records', 'People', 20),
  ('people', 'update', 'people.update', 'Edit person records', 'People', 30),
  ('people', 'delete', 'people.delete', 'Delete person records', 'People', 40),
  ('people', 'merge',  'people.merge',  'Merge duplicate persons', 'People', 50),
  ('people', 'manage', 'people.manage', 'Full people management', 'People', 60),

  -- Households
  ('households', 'create', 'households.create', 'Create households', 'Households', 10),
  ('households', 'read',   'households.read',   'View households', 'Households', 20),
  ('households', 'update', 'households.update', 'Edit households', 'Households', 30),
  ('households', 'delete', 'households.delete', 'Delete households', 'Households', 40),
  ('households', 'manage', 'households.manage', 'Full household management', 'Households', 50),

  -- Visits
  ('visits', 'create', 'visits.create', 'Record visits', 'Visits', 10),
  ('visits', 'read',   'visits.read',   'View visits', 'Visits', 20),
  ('visits', 'update', 'visits.update', 'Edit visits', 'Visits', 30),
  ('visits', 'delete', 'visits.delete', 'Delete visits', 'Visits', 40),
  ('visits', 'manage', 'visits.manage', 'Full visit management', 'Visits', 50),

  -- Staff
  ('staff', 'create', 'staff.create', 'Add staff members', 'Staff', 10),
  ('staff', 'read',   'staff.read',   'View staff', 'Staff', 20),
  ('staff', 'update', 'staff.update', 'Edit staff assignments', 'Staff', 30),
  ('staff', 'delete', 'staff.delete', 'Remove staff', 'Staff', 40),
  ('staff', 'manage', 'staff.manage', 'Full staff management', 'Staff', 50),

  -- Roles & Permissions
  ('roles', 'create', 'roles.create', 'Create roles', 'Roles', 10),
  ('roles', 'read',   'roles.read',   'View roles', 'Roles', 20),
  ('roles', 'update', 'roles.update', 'Edit roles & capabilities', 'Roles', 30),
  ('roles', 'delete', 'roles.delete', 'Delete roles', 'Roles', 40),
  ('roles', 'manage', 'roles.manage', 'Full role management', 'Roles', 50),

  -- Settings
  ('settings', 'read',   'settings.read',   'View org settings', 'Settings', 10),
  ('settings', 'update', 'settings.update', 'Edit org settings', 'Settings', 20),
  ('settings', 'manage', 'settings.manage', 'Full settings management', 'Settings', 30),

  -- Billing
  ('billing', 'read',   'billing.read',   'View billing information', 'Billing', 10),
  ('billing', 'manage', 'billing.manage', 'Manage billing & payments', 'Billing', 20),

  -- Events
  ('events', 'create', 'events.create', 'Create events', 'Events', 10),
  ('events', 'read',   'events.read',   'View events', 'Events', 20),
  ('events', 'update', 'events.update', 'Edit events', 'Events', 30),
  ('events', 'delete', 'events.delete', 'Delete events', 'Events', 40),
  ('events', 'manage', 'events.manage', 'Full event management', 'Events', 50)

ON CONFLICT (key) DO NOTHING;
