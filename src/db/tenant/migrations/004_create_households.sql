-- Tenant Migration 004: Households
-- Groups of persons (families). A person can belong to multiple households.

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,                            -- Optional; e.g., "The Smith Family"
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons(id),
  role household_role NOT NULL DEFAULT 'other',
  can_manage_logins boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,              -- Nullable; soft removal
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_household_members_household ON household_members (household_id);
CREATE INDEX idx_household_members_person ON household_members (person_id);
CREATE INDEX idx_household_members_active ON household_members (household_id) WHERE removed_at IS NULL;
