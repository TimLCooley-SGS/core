-- Tenant Migration 011: Membership Card Designs
-- Configurable card designs for printing/downloading membership cards.

CREATE TABLE membership_card_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pdf_name text,
  status membership_plan_status NOT NULL DEFAULT 'active',
  -- Per-side field arrays (max 4 each, enforced in app layer)
  front_fields text[] NOT NULL DEFAULT '{"program_name","member_name","expiration_date","status"}',
  back_fields text[] NOT NULL DEFAULT '{"membership_id","barcode","member_since","amount"}',
  -- Colors
  font_color text NOT NULL DEFAULT '#000000',
  accent_color text NOT NULL DEFAULT '#4E2C70',
  background_color text NOT NULL DEFAULT '#FFFFFF',
  -- Image (front only)
  front_image_url text,
  -- Settings
  default_side text NOT NULL DEFAULT 'front' CHECK (default_side IN ('front', 'back')),
  is_default boolean NOT NULL DEFAULT false,
  card_options jsonb NOT NULL DEFAULT '{"print":true,"download_pdf":true,"apple_wallet":false,"google_wallet":false,"push_notifications":false}',
  restricted_plan_ids uuid[] DEFAULT NULL,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_card_designs_status ON membership_card_designs (status);
CREATE INDEX idx_card_designs_default ON membership_card_designs (is_default) WHERE is_default = true;

-- Updated-at trigger
CREATE TRIGGER trg_card_designs_updated_at
  BEFORE UPDATE ON membership_card_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Single-default trigger: when a card is set as default, unset all others
CREATE OR REPLACE FUNCTION enforce_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE membership_card_designs
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_default_card
  AFTER INSERT OR UPDATE OF is_default ON membership_card_designs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_card();
