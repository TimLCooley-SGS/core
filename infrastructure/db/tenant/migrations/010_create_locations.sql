-- Tenant Migration 010: Locations & Blocked Dates
-- Physical spaces within an org and date-blocking for calendars.

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity int CHECK (capacity > 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_blocked_dates_updated_at
  BEFORE UPDATE ON blocked_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_blocked_dates_location ON blocked_dates (location_id);
CREATE INDEX idx_blocked_dates_range ON blocked_dates (start_date, end_date);
CREATE INDEX idx_blocked_dates_org_wide ON blocked_dates (start_date, end_date) WHERE location_id IS NULL;
