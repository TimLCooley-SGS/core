-- Tenant Migration 014: Ticket Designs
-- Configurable ticket designs controlling how tickets appear in emails/PDFs.

CREATE TABLE ticket_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status membership_plan_status NOT NULL DEFAULT 'active',
  field_config jsonb NOT NULL DEFAULT '{"guest_name":true,"date":true,"time":true,"barcode":true,"event_name":true,"location":true,"ticket_price":true,"ticket_number":true,"order_number":true,"registrant_name":false}',
  options jsonb NOT NULL DEFAULT '{"mobile_pdf":true,"print_tickets":true,"download_tickets":true,"display_tickets_first":false,"qr_code":false}',
  background_color text NOT NULL DEFAULT '#FFF8E1',
  font_color text NOT NULL DEFAULT '#000000',
  body_text text NOT NULL DEFAULT '<h1>Your Tickets</h1><p>Your membership card and ID are required for member admissions.</p><p>Need assistance, please call us.</p>',
  terms_text text NOT NULL DEFAULT '<p><strong>TERMS AND CONDITIONS</strong> NO REFUNDS. RESALE IS PROHIBITED.</p>',
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ticket_designs_status ON ticket_designs (status);
CREATE INDEX idx_ticket_designs_default ON ticket_designs (is_default) WHERE is_default = true;

-- Updated-at trigger
CREATE TRIGGER trg_ticket_designs_updated_at
  BEFORE UPDATE ON ticket_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Single-default trigger: when a design is set as default, unset all others
CREATE OR REPLACE FUNCTION enforce_single_default_ticket_design()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE ticket_designs
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_default_ticket_design
  AFTER INSERT OR UPDATE OF is_default ON ticket_designs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_ticket_design();
