-- Membership email rules: configurable email scheduling for membership events
CREATE TABLE membership_email_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_template_id uuid REFERENCES email_templates(id),
  trigger_event text NOT NULL CHECK (trigger_event IN ('purchase', 'expiration')),
  offset_days int NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_membership_email_rules_active ON membership_email_rules (is_active) WHERE is_active = true;

CREATE TRIGGER trg_membership_email_rules_updated_at
  BEFORE UPDATE ON membership_email_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
