CREATE TABLE email_template_folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_email_template_folders_updated_at
  BEFORE UPDATE ON email_template_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE email_templates
  ADD COLUMN folder_id uuid REFERENCES email_template_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_email_templates_folder ON email_templates (folder_id);
