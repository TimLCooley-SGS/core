-- Remove the 63-character max length on organization slugs.
-- Orgs with long names need longer slugs.
ALTER TABLE organizations
  DROP CONSTRAINT chk_organizations_slug_format;

ALTER TABLE organizations
  ADD CONSTRAINT chk_organizations_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) >= 3);
