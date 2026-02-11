-- Tenant Migration 013: Ticket Types & Price Types
-- Product definitions for tickets that can be sold.

-- Enums
CREATE TYPE ticket_mode AS ENUM ('timed_entry', 'daily_admission');
CREATE TYPE ticket_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE pricing_mode AS ENUM ('flat', 'semi_dynamic', 'full_dynamic');
CREATE TYPE purchase_window AS ENUM ('2_weeks', '30_days', '60_days', '90_days', 'none');

-- 1) ticket_types: the catalog of ticket products
CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  ticket_mode ticket_mode NOT NULL,
  location_id uuid REFERENCES locations(id),
  tags text[] NOT NULL DEFAULT '{}',
  banner_image_url text,
  square_image_url text,
  include_terms boolean NOT NULL DEFAULT false,
  pricing_mode pricing_mode NOT NULL DEFAULT 'flat',
  guest_allowance int NOT NULL DEFAULT 100 CHECK (guest_allowance > 0),
  purchase_window purchase_window NOT NULL DEFAULT '30_days',
  timed_interval_minutes int CHECK (timed_interval_minutes IS NULL OR timed_interval_minutes > 0),
  entry_window_minutes int CHECK (entry_window_minutes IS NULL OR entry_window_minutes > 0),
  selling_channels jsonb NOT NULL DEFAULT '{"in_person_counter":false,"in_person_kiosk":false,"online":false}',
  delivery_formats jsonb NOT NULL DEFAULT '{"email":false,"google_wallet":false,"apple_wallet":false}',
  email_settings jsonb NOT NULL DEFAULT '{"post_purchase":true,"reminder_1day":true,"reminder_1hour":true,"day_after":true}',
  status ticket_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_timed_entry_fields CHECK (
    ticket_mode != 'timed_entry' OR (timed_interval_minutes IS NOT NULL AND entry_window_minutes IS NOT NULL)
  )
);

CREATE INDEX idx_ticket_types_status ON ticket_types (status);
CREATE INDEX idx_ticket_types_location ON ticket_types (location_id) WHERE location_id IS NOT NULL;

CREATE TRIGGER trg_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2) ticket_price_types: price tiers within a ticket type
CREATE TABLE ticket_price_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int CHECK (price_cents IS NULL OR price_cents >= 0),
  day_prices jsonb,
  target_price_cents int CHECK (target_price_cents IS NULL OR target_price_cents >= 0),
  tax_rate numeric(5,4) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_price_types_ticket ON ticket_price_types (ticket_type_id);

CREATE TRIGGER trg_ticket_price_types_updated_at
  BEFORE UPDATE ON ticket_price_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
