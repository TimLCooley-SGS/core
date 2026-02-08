-- Control Plane Migration 004: Identity-Org Links
-- The routing table. Determines which orgs a user can access and what
-- person record they map to in each tenant database.

CREATE TABLE identity_org_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_identity_id uuid NOT NULL REFERENCES global_identities(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  tenant_person_id uuid NOT NULL,     -- Person ID inside the tenant DB
  has_staff_access boolean NOT NULL DEFAULT false,
  has_patron_access boolean NOT NULL DEFAULT true,
  status identity_org_link_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_identity_org UNIQUE (global_identity_id, organization_id)
);

CREATE INDEX idx_identity_org_links_identity ON identity_org_links (global_identity_id);
CREATE INDEX idx_identity_org_links_org ON identity_org_links (organization_id);
CREATE INDEX idx_identity_org_links_status ON identity_org_links (status) WHERE status = 'active';
