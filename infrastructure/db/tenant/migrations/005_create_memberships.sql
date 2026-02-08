-- Tenant Migration 005: Memberships (Seat-Based)
-- Plans define the catalog. Memberships are purchased instances. Seats are individually assignable.

-- Membership plans: the catalog
CREATE TABLE membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                   -- e.g., "Individual", "Family 5-Pack"
  description text,
  seat_count integer NOT NULL CHECK (seat_count > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  duration_days integer NOT NULL CHECK (duration_days > 0),
  is_recurring boolean NOT NULL DEFAULT false,
  stripe_price_id text,
  status membership_plan_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_membership_plans_status ON membership_plans (status);

CREATE TRIGGER trg_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Memberships: purchased instances
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_plan_id uuid NOT NULL REFERENCES membership_plans(id),
  purchased_by_person_id uuid NOT NULL REFERENCES persons(id),
  household_id uuid REFERENCES households(id),
  status membership_status NOT NULL DEFAULT 'pending_payment',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_membership_dates CHECK (ends_at > starts_at)
);

CREATE INDEX idx_memberships_plan ON memberships (membership_plan_id);
CREATE INDEX idx_memberships_purchaser ON memberships (purchased_by_person_id);
CREATE INDEX idx_memberships_household ON memberships (household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_memberships_status ON memberships (status);
CREATE INDEX idx_memberships_active ON memberships (status, starts_at, ends_at) WHERE status = 'active';

CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Membership seats: individual assignable seats within a membership
CREATE TABLE membership_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  seat_number integer NOT NULL CHECK (seat_number > 0),
  person_id uuid REFERENCES persons(id),       -- Nullable; null = unassigned
  assigned_at timestamptz,
  assigned_by_person_id uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_membership_seat_number UNIQUE (membership_id, seat_number)
);

CREATE INDEX idx_membership_seats_membership ON membership_seats (membership_id);
CREATE INDEX idx_membership_seats_person ON membership_seats (person_id) WHERE person_id IS NOT NULL;

CREATE TRIGGER trg_membership_seats_updated_at
  BEFORE UPDATE ON membership_seats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Membership seat history: full audit trail of seat changes
CREATE TABLE membership_seat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_seat_id uuid NOT NULL REFERENCES membership_seats(id) ON DELETE CASCADE,
  person_id uuid REFERENCES persons(id),       -- Who was assigned/unassigned
  action seat_action NOT NULL,
  performed_by_person_id uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now()   -- Immutable
);

CREATE INDEX idx_seat_history_seat ON membership_seat_history (membership_seat_id);
CREATE INDEX idx_seat_history_person ON membership_seat_history (person_id) WHERE person_id IS NOT NULL;
