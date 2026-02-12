CREATE TABLE email_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  subject      text NOT NULL DEFAULT '',
  preheader    text NOT NULL DEFAULT '',
  blocks       jsonb NOT NULL DEFAULT '[]',
  settings     jsonb NOT NULL DEFAULT '{}',
  html_content text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by   uuid REFERENCES persons(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_status ON email_templates (status);
CREATE INDEX idx_email_templates_created_at ON email_templates (created_at DESC);

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
