-- Tenant Migration 021: Events
-- Event scheduling, registration, and check-in.

-- Enums
CREATE TYPE event_type AS ENUM ('single', 'multi_day', 'recurring');
CREATE TYPE event_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE recurrence_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');
CREATE TYPE registration_status AS ENUM ('confirmed', 'waitlisted', 'cancelled', 'pending_payment');

-- 1) events: core event record
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  event_type event_type NOT NULL,
  location_id uuid REFERENCES locations(id),
  banner_image_url text,
  square_image_url text,
  capacity int CHECK (capacity IS NULL OR capacity > 0),
  is_free boolean NOT NULL DEFAULT true,
  registration_required boolean NOT NULL DEFAULT true,
  enable_check_in boolean NOT NULL DEFAULT true,
  selling_channels jsonb NOT NULL DEFAULT '{"in_person_counter":false,"in_person_kiosk":false,"online":false}',
  delivery_formats jsonb NOT NULL DEFAULT '{"email":false,"google_wallet":false,"apple_wallet":false}',
  email_settings jsonb NOT NULL DEFAULT '{"confirmation":true,"reminder_1day":true,"reminder_1hour":true,"followup":true}',
  status event_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_event_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$')
);

CREATE UNIQUE INDEX idx_events_slug_active ON events (slug) WHERE status != 'archived';
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_location ON events (location_id) WHERE location_id IS NOT NULL;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2) event_recurrence_rules: recurrence pattern for recurring events
CREATE TABLE event_recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  frequency recurrence_frequency NOT NULL,
  days_of_week int[] NOT NULL DEFAULT '{}',
  start_time time,
  end_time time,
  start_date date NOT NULL,
  end_date date,
  occurrence_count int CHECK (occurrence_count IS NULL OR occurrence_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_recurrence_end CHECK (end_date IS NOT NULL OR occurrence_count IS NOT NULL)
);

CREATE INDEX idx_event_recurrence_rules_event ON event_recurrence_rules (event_id);

CREATE TRIGGER trg_event_recurrence_rules_updated_at
  BEFORE UPDATE ON event_recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3) event_schedules: individual date/time occurrences
CREATE TABLE event_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time,
  end_time time,
  is_all_day boolean NOT NULL DEFAULT false,
  is_cancelled boolean NOT NULL DEFAULT false,
  capacity_override int CHECK (capacity_override IS NULL OR capacity_override > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_schedules_event ON event_schedules (event_id);
CREATE INDEX idx_event_schedules_date ON event_schedules (date);

CREATE TRIGGER trg_event_schedules_updated_at
  BEFORE UPDATE ON event_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4) event_price_types: pricing tiers per event
CREATE TABLE event_price_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int NOT NULL CHECK (price_cents >= 0),
  tax_rate numeric(5,4) NOT NULL DEFAULT 0,
  capacity int CHECK (capacity IS NULL OR capacity > 0),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_price_types_event ON event_price_types (event_id);

CREATE TRIGGER trg_event_price_types_updated_at
  BEFORE UPDATE ON event_price_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5) event_registrations: per-occurrence registration
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES event_schedules(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons(id),
  price_type_id uuid REFERENCES event_price_types(id),
  status registration_status NOT NULL DEFAULT 'confirmed',
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_cents int NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  stripe_payment_intent_id text,
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES persons(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_registrations_event ON event_registrations (event_id);
CREATE INDEX idx_event_registrations_schedule ON event_registrations (schedule_id);
CREATE INDEX idx_event_registrations_person ON event_registrations (person_id);
CREATE INDEX idx_event_registrations_status ON event_registrations (status);

CREATE TRIGGER trg_event_registrations_updated_at
  BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6) event_tags: links events to shared tags
CREATE TABLE event_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, tag_id)
);

CREATE INDEX idx_event_tags_event ON event_tags (event_id);
CREATE INDEX idx_event_tags_tag ON event_tags (tag_id);
