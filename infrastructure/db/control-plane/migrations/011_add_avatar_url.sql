-- Control Plane Migration 011: Add avatar_url to global_identities
ALTER TABLE global_identities ADD COLUMN avatar_url text;
