-- Per-org sender email address for outgoing emails
ALTER TABLE organizations ADD COLUMN from_email text;
