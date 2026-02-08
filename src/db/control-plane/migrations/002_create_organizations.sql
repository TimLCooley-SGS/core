-- Control Plane Migration 002: Organizations table
-- Central registry of all client organizations on the platform.

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  supabase_project_id text,
  supabase_url text,
  supabase_anon_key text,       -- Encrypted at application layer
  supabase_service_key text,    -- Encrypted at application layer; never exposed to client
  status org_status NOT NULL DEFAULT 'provisioning',
  plan_tier text,
  stripe_connect_account_id text,
  stripe_onboarding_complete boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_organizations_status ON organizations (status);
CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_stripe_connect ON organizations (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Slug validation: lowercase alphanumeric and hyphens only
ALTER TABLE organizations
  ADD CONSTRAINT chk_organizations_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) >= 3 AND length(slug) <= 63);
