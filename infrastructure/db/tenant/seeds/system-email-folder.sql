-- Seed the protected "System Emails" folder
INSERT INTO email_template_folders (name, is_system)
SELECT 'System Emails', true
WHERE NOT EXISTS (
  SELECT 1 FROM email_template_folders WHERE name = 'System Emails' AND is_system = true
);
