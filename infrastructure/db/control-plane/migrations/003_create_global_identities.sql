-- Control Plane Migration 003: Global Identities
-- Maps 1:1 to Supabase auth.users. The "one login, many orgs" bridge.

CREATE TABLE global_identities (
  id uuid PRIMARY KEY,           -- Same as auth.users.id
  primary_email text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_identities_email ON global_identities (primary_email);

CREATE TRIGGER trg_global_identities_updated_at
  BEFORE UPDATE ON global_identities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
