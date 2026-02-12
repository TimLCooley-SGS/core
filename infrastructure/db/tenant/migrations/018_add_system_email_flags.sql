-- System protection flags for email templates and folders
ALTER TABLE email_templates
  ADD COLUMN is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN system_key text UNIQUE;

ALTER TABLE email_template_folders
  ADD COLUMN is_system boolean NOT NULL DEFAULT false;
