/**
 * Shared provisioning logic for tenant organizations.
 *
 * Used by:
 * - The web UI create-org flow (inline provisioning)
 * - The CLI `provision-org.ts` script
 *
 * Migration SQL is bundled as strings so this works in serverless
 * environments (Vercel) where the filesystem isn't available.
 */
import pg from "pg";

const SUPABASE_MGMT_API = "https://api.supabase.com/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingAdmin {
  global_identity_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

interface SupabaseProject {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  endpoint: string;
}

// ---------------------------------------------------------------------------
// Supabase Management API helpers
// ---------------------------------------------------------------------------

export async function supabaseMgmtFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required");

  const res = await fetch(`${SUPABASE_MGMT_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase API error ${res.status}: ${body}`);
  }

  return res;
}

export async function createSupabaseProject(
  name: string,
  dbPassword: string,
): Promise<SupabaseProject> {
  const orgId = process.env.SUPABASE_ORG_ID;
  if (!orgId) throw new Error("SUPABASE_ORG_ID is required");

  const res = await supabaseMgmtFetch("/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: orgId,
      name,
      db_pass: dbPassword,
      region: "us-east-1",
      plan: "free",
    }),
  });

  return (await res.json()) as SupabaseProject;
}

export async function waitForProject(
  projectRef: string,
  maxWaitMs = 300_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await supabaseMgmtFetch(`/projects/${projectRef}`);
    const project = (await res.json()) as { status: string };
    if (project.status === "ACTIVE_HEALTHY") return;
    console.log(
      `  Waiting for project to be ready (status: ${project.status})...`,
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(
    `Project ${projectRef} did not become ready within ${maxWaitMs / 1000}s`,
  );
}

export async function getApiKeys(
  projectRef: string,
): Promise<{ anon: string; service_role: string }> {
  const res = await supabaseMgmtFetch(`/projects/${projectRef}/api-keys`);
  const keys = (await res.json()) as { name: string; api_key: string }[];

  const anon = keys.find((k) => k.name === "anon")?.api_key;
  const serviceRole = keys.find((k) => k.name === "service_role")?.api_key;

  if (!anon || !serviceRole) throw new Error("Could not find API keys");
  return { anon, service_role: serviceRole };
}

export async function deleteSupabaseProject(
  projectRef: string,
): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required");

  const res = await fetch(`${SUPABASE_MGMT_API}/projects/${projectRef}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.warn(
      `Warning: Failed to delete Supabase project ${projectRef}: ${res.status} ${body}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Bundled tenant migrations & seeds
// ---------------------------------------------------------------------------
// SQL is embedded as strings so this module works in serverless environments
// (e.g. Vercel) where the infrastructure/ directory isn't on the filesystem.
// When adding a new migration file, add a corresponding entry here.

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "001_create_enums.sql",
    sql: `
CREATE TYPE person_status AS ENUM ('active', 'inactive', 'merged');
CREATE TYPE household_role AS ENUM ('primary', 'co_primary', 'dependent', 'other');
CREATE TYPE membership_status AS ENUM ('active', 'expired', 'cancelled', 'pending_payment');
CREATE TYPE membership_plan_status AS ENUM ('active', 'archived');
CREATE TYPE seat_action AS ENUM ('assigned', 'unassigned', 'transferred');
CREATE TYPE staff_assignment_status AS ENUM ('active', 'inactive');
CREATE TYPE override_type AS ENUM ('grant', 'revoke');
CREATE TYPE merge_request_status AS ENUM ('pending', 'approved', 'completed', 'rejected');
CREATE TYPE merge_log_action AS ENUM ('fk_repointed', 'field_updated', 'archived');
CREATE TYPE visit_type AS ENUM ('day_pass', 'member_visit', 'event', 'program', 'other');
CREATE TYPE audit_actor_type AS ENUM ('staff', 'patron', 'system', 'sgs_support');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'merge', 'login', 'logout', 'assign', 'unassign', 'transfer');
`,
  },
  {
    name: "002_create_persons.sql",
    sql: `
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  display_name text,
  email text,
  phone text,
  date_of_birth date,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  global_identity_id uuid,
  login_enabled boolean NOT NULL DEFAULT false,
  status person_status NOT NULL DEFAULT 'active',
  merged_into_id uuid REFERENCES persons(id),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  CONSTRAINT chk_merged_has_target CHECK (
    (status = 'merged' AND merged_into_id IS NOT NULL) OR
    (status != 'merged' AND merged_into_id IS NULL)
  )
);

CREATE INDEX idx_persons_email ON persons (email) WHERE email IS NOT NULL;
CREATE INDEX idx_persons_global_identity ON persons (global_identity_id) WHERE global_identity_id IS NOT NULL;
CREATE INDEX idx_persons_status ON persons (status);
CREATE INDEX idx_persons_name ON persons (last_name, first_name);
CREATE INDEX idx_persons_merged_into ON persons (merged_into_id) WHERE merged_into_id IS NOT NULL;

CREATE TRIGGER trg_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`,
  },
  {
    name: "003_create_staff_permissions.sql",
    sql: `
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource text NOT NULL,
  action text NOT NULL,
  key text NOT NULL UNIQUE,
  description text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_capabilities_resource_action UNIQUE (resource, action)
);

CREATE INDEX idx_capabilities_category ON capabilities (category, sort_order);

CREATE TABLE role_capabilities (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, capability_id)
);

CREATE TABLE staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES persons(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  status staff_assignment_status NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_assignments_person ON staff_assignments (person_id);
CREATE INDEX idx_staff_assignments_role ON staff_assignments (role_id);
CREATE INDEX idx_staff_assignments_active ON staff_assignments (person_id, status) WHERE status = 'active';

CREATE TRIGGER trg_staff_assignments_updated_at
  BEFORE UPDATE ON staff_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE staff_capability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_assignment_id uuid NOT NULL REFERENCES staff_assignments(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES capabilities(id),
  override_type override_type NOT NULL,
  granted_by uuid REFERENCES persons(id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_override_per_capability UNIQUE (staff_assignment_id, capability_id)
);

CREATE INDEX idx_staff_overrides_assignment ON staff_capability_overrides (staff_assignment_id);
`,
  },
  {
    name: "004_create_households.sql",
    sql: `
CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_households_updated_at
  BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons(id),
  role household_role NOT NULL DEFAULT 'other',
  can_manage_logins boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_household_members_household ON household_members (household_id);
CREATE INDEX idx_household_members_person ON household_members (person_id);
CREATE INDEX idx_household_members_active ON household_members (household_id) WHERE removed_at IS NULL;
`,
  },
  {
    name: "005_create_memberships.sql",
    sql: `
CREATE TABLE membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  seat_count integer NOT NULL CHECK (seat_count > 0),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  duration_days integer NOT NULL CHECK (duration_days > 0),
  is_recurring boolean NOT NULL DEFAULT false,
  stripe_price_id text,
  status membership_plan_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_membership_plans_status ON membership_plans (status);

CREATE TRIGGER trg_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_plan_id uuid NOT NULL REFERENCES membership_plans(id),
  purchased_by_person_id uuid NOT NULL REFERENCES persons(id),
  household_id uuid REFERENCES households(id),
  status membership_status NOT NULL DEFAULT 'pending_payment',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_membership_dates CHECK (ends_at > starts_at)
);

CREATE INDEX idx_memberships_plan ON memberships (membership_plan_id);
CREATE INDEX idx_memberships_purchaser ON memberships (purchased_by_person_id);
CREATE INDEX idx_memberships_household ON memberships (household_id) WHERE household_id IS NOT NULL;
CREATE INDEX idx_memberships_status ON memberships (status);
CREATE INDEX idx_memberships_active ON memberships (status, starts_at, ends_at) WHERE status = 'active';

CREATE TRIGGER trg_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE membership_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  seat_number integer NOT NULL CHECK (seat_number > 0),
  person_id uuid REFERENCES persons(id),
  assigned_at timestamptz,
  assigned_by_person_id uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_membership_seat_number UNIQUE (membership_id, seat_number)
);

CREATE INDEX idx_membership_seats_membership ON membership_seats (membership_id);
CREATE INDEX idx_membership_seats_person ON membership_seats (person_id) WHERE person_id IS NOT NULL;

CREATE TRIGGER trg_membership_seats_updated_at
  BEFORE UPDATE ON membership_seats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE membership_seat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_seat_id uuid NOT NULL REFERENCES membership_seats(id) ON DELETE CASCADE,
  person_id uuid REFERENCES persons(id),
  action seat_action NOT NULL,
  performed_by_person_id uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seat_history_seat ON membership_seat_history (membership_seat_id);
CREATE INDEX idx_seat_history_person ON membership_seat_history (person_id) WHERE person_id IS NOT NULL;
`,
  },
  {
    name: "006_create_donations_visits.sql",
    sql: `
CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES persons(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'usd',
  campaign text,
  donation_date timestamptz NOT NULL DEFAULT now(),
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_person ON donations (person_id);
CREATE INDEX idx_donations_date ON donations (donation_date);
CREATE INDEX idx_donations_campaign ON donations (campaign) WHERE campaign IS NOT NULL;

CREATE TABLE visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES persons(id),
  visit_type visit_type NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_person ON visits (person_id);
CREATE INDEX idx_visits_date ON visits (visited_at);
CREATE INDEX idx_visits_type ON visits (visit_type);
`,
  },
  {
    name: "007_create_dedup.sql",
    sql: `
CREATE TABLE person_merge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_person_id uuid NOT NULL REFERENCES persons(id),
  target_person_id uuid NOT NULL REFERENCES persons(id),
  status merge_request_status NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL REFERENCES persons(id),
  reviewed_by uuid REFERENCES persons(id),
  merge_strategy jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_merge_not_self CHECK (source_person_id != target_person_id)
);

CREATE INDEX idx_merge_requests_source ON person_merge_requests (source_person_id);
CREATE INDEX idx_merge_requests_target ON person_merge_requests (target_person_id);
CREATE INDEX idx_merge_requests_status ON person_merge_requests (status) WHERE status IN ('pending', 'approved');

CREATE TRIGGER trg_merge_requests_updated_at
  BEFORE UPDATE ON person_merge_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE person_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_request_id uuid NOT NULL REFERENCES person_merge_requests(id),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action merge_log_action NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_merge_log_request ON person_merge_log (merge_request_id);
`,
  },
  {
    name: "008_create_audit_log.sql",
    sql: `
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_person_id uuid REFERENCES persons(id),
  actor_type audit_actor_type NOT NULL,
  impersonation_session_id uuid,
  impersonated_by_email text,
  action audit_action NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_tenant_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % operations are not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_tenant_audit_log_modification();

CREATE INDEX idx_audit_log_actor ON audit_log (actor_person_id);
CREATE INDEX idx_audit_log_action ON audit_log (action);
CREATE INDEX idx_audit_log_table ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at);
CREATE INDEX idx_audit_log_impersonation ON audit_log (impersonation_session_id) WHERE impersonation_session_id IS NOT NULL;
`,
  },
  {
    name: "009_create_views.sql",
    sql: `
CREATE VIEW active_members AS
SELECT DISTINCT p.*
FROM persons p
JOIN membership_seats ms ON ms.person_id = p.id
JOIN memberships m ON m.id = ms.membership_id
WHERE m.status = 'active'
  AND now() BETWEEN m.starts_at AND m.ends_at;

CREATE VIEW donors AS
SELECT DISTINCT p.*
FROM persons p
JOIN donations d ON d.person_id = p.id;

CREATE VIEW recent_visitors AS
SELECT DISTINCT p.*
FROM persons p
JOIN visits v ON v.person_id = p.id;
`,
  },
  {
    name: "010_create_locations.sql",
    sql: `
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capacity int CHECK (capacity > 0),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_blocked_dates_updated_at
  BEFORE UPDATE ON blocked_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_blocked_dates_location ON blocked_dates (location_id);
CREATE INDEX idx_blocked_dates_range ON blocked_dates (start_date, end_date);
CREATE INDEX idx_blocked_dates_org_wide ON blocked_dates (start_date, end_date) WHERE location_id IS NULL;
`,
  },
  {
    name: "011_create_membership_card_designs.sql",
    sql: `
CREATE TABLE membership_card_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pdf_name text,
  status membership_plan_status NOT NULL DEFAULT 'active',
  front_fields text[] NOT NULL DEFAULT '{"program_name","member_name","expiration_date","status"}',
  back_fields text[] NOT NULL DEFAULT '{"membership_id","barcode","member_since","amount"}',
  font_color text NOT NULL DEFAULT '#000000',
  accent_color text NOT NULL DEFAULT '#4E2C70',
  background_color text NOT NULL DEFAULT '#FFFFFF',
  front_image_url text,
  default_side text NOT NULL DEFAULT 'front' CHECK (default_side IN ('front', 'back')),
  is_default boolean NOT NULL DEFAULT false,
  card_options jsonb NOT NULL DEFAULT '{"print":true,"download_pdf":true,"apple_wallet":false,"google_wallet":false,"push_notifications":false}',
  restricted_plan_ids uuid[] DEFAULT NULL,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_designs_status ON membership_card_designs (status);
CREATE INDEX idx_card_designs_default ON membership_card_designs (is_default) WHERE is_default = true;

CREATE TRIGGER trg_card_designs_updated_at
  BEFORE UPDATE ON membership_card_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION enforce_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE membership_card_designs
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_default_card
  AFTER INSERT OR UPDATE OF is_default ON membership_card_designs
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_card();
`,
  },
  {
    name: "012_create_portal_tables.sql",
    sql: `
CREATE TYPE portal_module_type AS ENUM ('text','video','pdf','audio','html','file_download');
CREATE TYPE portal_module_status AS ENUM ('draft','published','archived');
CREATE TYPE portal_announcement_status AS ENUM ('draft','published','archived');
CREATE TYPE portal_question_status AS ENUM ('pending','answered','archived');

CREATE TABLE portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_published boolean NOT NULL DEFAULT false,
  hero_image_url text,
  welcome_heading text NOT NULL DEFAULT 'Welcome to Your Membership Portal',
  welcome_body text NOT NULL DEFAULT '',
  button_text text NOT NULL DEFAULT 'Sign In',
  helper_text text NOT NULL DEFAULT 'Enter your email to access your membership portal.',
  accent_color text NOT NULL DEFAULT '#4E2C70',
  restricted_card_design_ids uuid[] DEFAULT NULL,
  portal_slug text,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_portal_settings_updated_at
  BEFORE UPDATE ON portal_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE portal_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  module_type portal_module_type NOT NULL DEFAULT 'text',
  content_html text,
  embed_url text,
  file_url text,
  file_name text,
  file_size_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  status portal_module_status NOT NULL DEFAULT 'draft',
  restricted_card_design_ids uuid[] DEFAULT NULL,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_modules_status ON portal_modules (status);
CREATE INDEX idx_portal_modules_sort ON portal_modules (sort_order) WHERE status = 'published';

CREATE TRIGGER trg_portal_modules_updated_at
  BEFORE UPDATE ON portal_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE portal_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_html text NOT NULL DEFAULT '',
  status portal_announcement_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_announcements_status ON portal_announcements (status);
CREATE INDEX idx_portal_announcements_active ON portal_announcements (starts_at, ends_at) WHERE status = 'published';

CREATE TRIGGER trg_portal_announcements_updated_at
  BEFORE UPDATE ON portal_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE portal_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES persons(id),
  subject text NOT NULL,
  content text NOT NULL DEFAULT '',
  status portal_question_status NOT NULL DEFAULT 'pending',
  answer_html text,
  answered_by uuid REFERENCES persons(id),
  answered_at timestamptz,
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_questions_status ON portal_questions (status);
CREATE INDEX idx_portal_questions_person ON portal_questions (person_id);

CREATE TRIGGER trg_portal_questions_updated_at
  BEFORE UPDATE ON portal_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`,
  },
  {
    name: "013_create_tickets.sql",
    sql: `
CREATE TYPE ticket_mode AS ENUM ('timed_entry', 'daily_admission');
CREATE TYPE ticket_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE pricing_mode AS ENUM ('flat', 'semi_dynamic', 'full_dynamic');
CREATE TYPE purchase_window AS ENUM ('2_weeks', '30_days', '60_days', '90_days', 'none');

CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  ticket_mode ticket_mode NOT NULL,
  location_id uuid REFERENCES locations(id),
  tags text[] NOT NULL DEFAULT '{}',
  banner_image_url text,
  square_image_url text,
  include_terms boolean NOT NULL DEFAULT false,
  pricing_mode pricing_mode NOT NULL DEFAULT 'flat',
  guest_allowance int NOT NULL DEFAULT 100 CHECK (guest_allowance > 0),
  purchase_window purchase_window NOT NULL DEFAULT '30_days',
  timed_interval_minutes int CHECK (timed_interval_minutes IS NULL OR timed_interval_minutes > 0),
  entry_window_minutes int CHECK (entry_window_minutes IS NULL OR entry_window_minutes > 0),
  selling_channels jsonb NOT NULL DEFAULT '{"in_person_counter":false,"in_person_kiosk":false,"online":false}',
  delivery_formats jsonb NOT NULL DEFAULT '{"email":false,"google_wallet":false,"apple_wallet":false}',
  email_settings jsonb NOT NULL DEFAULT '{"post_purchase":true,"reminder_1day":true,"reminder_1hour":true,"day_after":true}',
  status ticket_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES persons(id),
  updated_by uuid REFERENCES persons(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_timed_entry_fields CHECK (
    ticket_mode != 'timed_entry' OR (timed_interval_minutes IS NOT NULL AND entry_window_minutes IS NOT NULL)
  )
);

CREATE INDEX idx_ticket_types_status ON ticket_types (status);
CREATE INDEX idx_ticket_types_location ON ticket_types (location_id) WHERE location_id IS NOT NULL;

CREATE TRIGGER trg_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE ticket_price_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents int CHECK (price_cents IS NULL OR price_cents >= 0),
  day_prices jsonb,
  target_price_cents int CHECK (target_price_cents IS NULL OR target_price_cents >= 0),
  tax_rate numeric(5,4) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_price_types_ticket ON ticket_price_types (ticket_type_id);

CREATE TRIGGER trg_ticket_price_types_updated_at
  BEFORE UPDATE ON ticket_price_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`,
  },
  {
    name: "014_create_ticket_designs.sql",
    sql: `
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

CREATE INDEX idx_ticket_designs_status ON ticket_designs (status);
CREATE INDEX idx_ticket_designs_default ON ticket_designs (is_default) WHERE is_default = true;

CREATE TRIGGER trg_ticket_designs_updated_at
  BEFORE UPDATE ON ticket_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
`,
  },
  {
    name: "015_create_tags_and_lists.sql",
    sql: `
CREATE TYPE contact_list_type AS ENUM ('smart', 'static');
CREATE TYPE filter_logic       AS ENUM ('and', 'or');

CREATE TABLE tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE TRIGGER trg_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE person_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  uuid NOT NULL REFERENCES persons(id),
  tag_id     uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_id, tag_id)
);

CREATE INDEX idx_person_tags_person ON person_tags (person_id);
CREATE INDEX idx_person_tags_tag ON person_tags (tag_id);

CREATE TABLE ticket_tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id  uuid NOT NULL REFERENCES ticket_types(id),
  tag_id          uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_type_id, tag_id)
);

CREATE INDEX idx_ticket_tags_ticket_type ON ticket_tags (ticket_type_id);
CREATE INDEX idx_ticket_tags_tag ON ticket_tags (tag_id);

CREATE TABLE contact_lists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  type         contact_list_type NOT NULL,
  filter_rules jsonb,
  created_by   uuid REFERENCES persons(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_contact_lists_updated_at
  BEFORE UPDATE ON contact_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE contact_list_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id    uuid NOT NULL REFERENCES contact_lists(id) ON DELETE CASCADE,
  person_id  uuid NOT NULL REFERENCES persons(id),
  added_at   timestamptz NOT NULL DEFAULT now(),
  added_by   uuid REFERENCES persons(id),
  UNIQUE (list_id, person_id)
);

CREATE INDEX idx_contact_list_members_list ON contact_list_members (list_id);
CREATE INDEX idx_contact_list_members_person ON contact_list_members (person_id);

ALTER PUBLICATION supabase_realtime ADD TABLE persons, person_tags, contact_list_members;
`,
  },
];

const SEEDS: { name: string; sql: string }[] = [
  {
    name: "capabilities.sql",
    sql: `
INSERT INTO capabilities (resource, action, key, description, category, sort_order) VALUES
  ('tickets', 'create', 'tickets.create', 'Create tickets', 'Tickets', 10),
  ('tickets', 'read',   'tickets.read',   'View tickets', 'Tickets', 20),
  ('tickets', 'update', 'tickets.update', 'Edit tickets', 'Tickets', 30),
  ('tickets', 'delete', 'tickets.delete', 'Delete tickets', 'Tickets', 40),
  ('tickets', 'manage', 'tickets.manage', 'Full ticket management', 'Tickets', 50),
  ('members', 'create', 'members.create', 'Create member records', 'Members', 10),
  ('members', 'read',   'members.read',   'View member records', 'Members', 20),
  ('members', 'update', 'members.update', 'Edit member records', 'Members', 30),
  ('members', 'delete', 'members.delete', 'Delete member records', 'Members', 40),
  ('members', 'manage', 'members.manage', 'Full member management', 'Members', 50),
  ('donations', 'create', 'donations.create', 'Record donations', 'Donations', 10),
  ('donations', 'read',   'donations.read',   'View donations', 'Donations', 20),
  ('donations', 'update', 'donations.update', 'Edit donations', 'Donations', 30),
  ('donations', 'delete', 'donations.delete', 'Delete donations', 'Donations', 40),
  ('donations', 'manage', 'donations.manage', 'Full donation management', 'Donations', 50),
  ('reports', 'read',   'reports.read',   'View reports', 'Reports', 10),
  ('reports', 'create', 'reports.create', 'Create custom reports', 'Reports', 20),
  ('reports', 'manage', 'reports.manage', 'Full report management', 'Reports', 30),
  ('people', 'create', 'people.create', 'Create person records', 'People', 10),
  ('people', 'read',   'people.read',   'View person records', 'People', 20),
  ('people', 'update', 'people.update', 'Edit person records', 'People', 30),
  ('people', 'delete', 'people.delete', 'Delete person records', 'People', 40),
  ('people', 'merge',  'people.merge',  'Merge duplicate persons', 'People', 50),
  ('people', 'manage', 'people.manage', 'Full people management', 'People', 60),
  ('households', 'create', 'households.create', 'Create households', 'Households', 10),
  ('households', 'read',   'households.read',   'View households', 'Households', 20),
  ('households', 'update', 'households.update', 'Edit households', 'Households', 30),
  ('households', 'delete', 'households.delete', 'Delete households', 'Households', 40),
  ('households', 'manage', 'households.manage', 'Full household management', 'Households', 50),
  ('visits', 'create', 'visits.create', 'Record visits', 'Visits', 10),
  ('visits', 'read',   'visits.read',   'View visits', 'Visits', 20),
  ('visits', 'update', 'visits.update', 'Edit visits', 'Visits', 30),
  ('visits', 'delete', 'visits.delete', 'Delete visits', 'Visits', 40),
  ('visits', 'manage', 'visits.manage', 'Full visit management', 'Visits', 50),
  ('staff', 'create', 'staff.create', 'Add staff members', 'Staff', 10),
  ('staff', 'read',   'staff.read',   'View staff', 'Staff', 20),
  ('staff', 'update', 'staff.update', 'Edit staff assignments', 'Staff', 30),
  ('staff', 'delete', 'staff.delete', 'Remove staff', 'Staff', 40),
  ('staff', 'manage', 'staff.manage', 'Full staff management', 'Staff', 50),
  ('roles', 'create', 'roles.create', 'Create roles', 'Roles', 10),
  ('roles', 'read',   'roles.read',   'View roles', 'Roles', 20),
  ('roles', 'update', 'roles.update', 'Edit roles & capabilities', 'Roles', 30),
  ('roles', 'delete', 'roles.delete', 'Delete roles', 'Roles', 40),
  ('roles', 'manage', 'roles.manage', 'Full role management', 'Roles', 50),
  ('settings', 'read',   'settings.read',   'View org settings', 'Settings', 10),
  ('settings', 'update', 'settings.update', 'Edit org settings', 'Settings', 20),
  ('settings', 'manage', 'settings.manage', 'Full settings management', 'Settings', 30),
  ('billing', 'read',   'billing.read',   'View billing information', 'Billing', 10),
  ('billing', 'manage', 'billing.manage', 'Manage billing & payments', 'Billing', 20),
  ('memberships', 'create', 'memberships.create', 'Create memberships', 'Memberships', 10),
  ('memberships', 'read',   'memberships.read',   'View memberships', 'Memberships', 20),
  ('memberships', 'update', 'memberships.update', 'Edit memberships', 'Memberships', 30),
  ('memberships', 'delete', 'memberships.delete', 'Delete memberships', 'Memberships', 40),
  ('memberships', 'manage', 'memberships.manage', 'Full membership management', 'Memberships', 50),
  ('events', 'create', 'events.create', 'Create events', 'Events', 10),
  ('events', 'read',   'events.read',   'View events', 'Events', 20),
  ('events', 'update', 'events.update', 'Edit events', 'Events', 30),
  ('events', 'delete', 'events.delete', 'Delete events', 'Events', 40),
  ('events', 'manage', 'events.manage', 'Full event management', 'Events', 50),
  ('analytics', 'read',   'analytics.read',   'View analytics', 'Analytics', 10),
  ('analytics', 'manage', 'analytics.manage', 'Full analytics management', 'Analytics', 20),
  ('persons', 'read', 'persons.read', 'View persons', 'Persons', 10),
  ('persons', 'manage', 'persons.manage', 'Full persons management', 'Persons', 20)
ON CONFLICT (key) DO NOTHING;
`,
  },
  {
    name: "default-roles.sql",
    sql: `
INSERT INTO roles (name, description, is_system) VALUES
  ('Org Admin', 'Full access to all org features and settings. Cannot be deleted.', true),
  ('Manager', 'Access to most features. Cannot manage billing or org settings.', false),
  ('Front Desk', 'Day-to-day operations: check-ins, memberships, basic people management.', false),
  ('Volunteer', 'Limited read access for volunteer-level tasks.', false);

INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Org Admin';

INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Manager'
  AND c.key NOT IN (
    'settings.manage',
    'billing.manage',
    'billing.read',
    'roles.manage',
    'roles.create',
    'roles.delete',
    'staff.manage',
    'staff.delete'
  );

INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Front Desk'
  AND c.key IN (
    'tickets.create', 'tickets.read', 'tickets.update',
    'members.read', 'members.update',
    'people.read', 'people.update',
    'households.read',
    'visits.create', 'visits.read',
    'donations.read'
  );

INSERT INTO role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM roles r
CROSS JOIN capabilities c
WHERE r.name = 'Volunteer'
  AND c.key IN (
    'tickets.read',
    'members.read',
    'people.read',
    'visits.read'
  );
`,
  },
];

// ---------------------------------------------------------------------------
// Database URL helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the connection pooler hostname for a Supabase project from the
 * Management API. The pooler hostname varies by cluster and can't be
 * predicted from the region alone.
 */
export async function getPoolerHost(
  projectRef: string,
): Promise<{ host: string; port: number }> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required for pooler lookup");
  }

  try {
    const res = await fetch(
      `${SUPABASE_MGMT_API}/projects/${projectRef}/config/database/pooler`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (res.ok) {
      const data = await res.json();
      // Response may be an array of pooler configs (transaction + session mode)
      const configs = Array.isArray(data) ? data : [data];
      // Prefer transaction mode (port 6543)
      const txMode = configs.find(
        (c: { db_port: number }) => c.db_port === 6543,
      );
      const config = txMode || configs[0];
      if (config?.db_host) {
        return { host: config.db_host, port: config.db_port ?? 6543 };
      }
    }
  } catch (err) {
    console.warn("Could not fetch pooler config from API:", err);
  }

  // Fallback: construct from region (best guess)
  console.warn("Using fallback pooler hostname for project", projectRef);
  return { host: `aws-0-us-east-1.pooler.supabase.com`, port: 6543 };
}

/**
 * Build a tenant database URL using the Supabase connection pooler.
 * Direct hostnames (db.{ref}.supabase.co) fail DNS on Vercel (IPv6).
 */
export function buildTenantDbUrl(
  projectRef: string,
  dbPassword: string,
  poolerHost: string,
  poolerPort: number = 6543,
): string {
  const encodedPassword = encodeURIComponent(dbPassword);
  return `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHost}:${poolerPort}/postgres`;
}

/**
 * Connect to Postgres with retry logic.
 * Newly created Supabase projects may take a few seconds for the connection
 * pooler to register the routing entry, causing "Tenant or user not found"
 * errors. This retries on that specific error.
 */
async function connectWithRetry(
  connectionString: string,
  maxRetries = 6,
  delayMs = 5000,
): Promise<pg.Client> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on pooler propagation errors
      if (!lastError.message.includes("Tenant or user not found")) {
        throw lastError;
      }
      console.warn(
        `Connection attempt ${attempt}/${maxRetries} failed: ${lastError.message}. Retrying in ${delayMs / 1000}s...`,
      );
      try { await client.end(); } catch { /* ignore */ }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError ?? new Error("Failed to connect after retries");
}

// ---------------------------------------------------------------------------
// Tenant migration runner
// ---------------------------------------------------------------------------

export async function runTenantMigrations(
  databaseUrl: string,
  options?: { seed?: boolean },
): Promise<void> {
  const client = await connectWithRetry(databaseUrl);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id serial PRIMARY KEY,
        name text NOT NULL UNIQUE,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations ORDER BY id",
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    let count = 0;
    for (const migration of MIGRATIONS) {
      if (appliedSet.has(migration.name)) {
        console.log(`  skip: ${migration.name} (already applied)`);
        continue;
      }

      console.log(`  apply: ${migration.name}`);

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          migration.name,
        ]);
        await client.query("COMMIT");
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAILED: ${migration.name}`);
        throw err;
      }
    }

    console.log(`Applied ${count} migration(s).`);

    if (options?.seed) {
      console.log("\nRunning seeds...");
      for (const seed of SEEDS) {
        if (appliedSet.has(`seed:${seed.name}`)) {
          console.log(`  skip seed: ${seed.name} (already applied)`);
          continue;
        }

        console.log(`  seed: ${seed.name}`);

        await client.query("BEGIN");
        try {
          await client.query(seed.sql);
          await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
            `seed:${seed.name}`,
          ]);
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`  SEED FAILED: ${seed.name}`);
          throw err;
        }
      }
    }
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Pending admin setup
// ---------------------------------------------------------------------------

export async function setupPendingAdmin(
  cpClient: pg.Client,
  tenantDbUrl: string,
  orgId: string,
  admin: PendingAdmin,
): Promise<void> {
  const tenantClient = await connectWithRetry(tenantDbUrl);

  try {
    const {
      rows: [person],
    } = await tenantClient.query(
      `INSERT INTO persons (first_name, last_name, display_name, email, global_identity_id, login_enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [
        admin.first_name,
        admin.last_name,
        admin.full_name,
        admin.email,
        admin.global_identity_id,
      ],
    );
    const personId = person.id as string;
    console.log(`  Created person: ${personId}`);

    const { rows: roleRows } = await tenantClient.query(
      `SELECT id FROM roles WHERE name = 'Org Admin' AND is_system = true LIMIT 1`,
    );
    if (roleRows.length > 0) {
      await tenantClient.query(
        `INSERT INTO staff_assignments (person_id, role_id) VALUES ($1, $2)`,
        [personId, roleRows[0].id],
      );
      console.log(`  Assigned "Org Admin" role`);
    } else {
      console.warn(
        `  WARNING: "Org Admin" role not found — skipping role assignment`,
      );
    }

    await cpClient.query(
      `INSERT INTO identity_org_links (global_identity_id, organization_id, tenant_person_id, has_staff_access, has_patron_access)
       VALUES ($1, $2, $3, true, true)`,
      [admin.global_identity_id, orgId, personId],
    );
    console.log(`  Created identity_org_link`);
  } finally {
    await tenantClient.end();
  }
}

/**
 * Tenant-only admin setup (creates person + assigns role in tenant DB).
 * Returns the tenant person ID for use in identity_org_links.
 */
export async function setupPendingAdminTenant(
  tenantDbUrl: string,
  admin: PendingAdmin,
): Promise<string> {
  const client = await connectWithRetry(tenantDbUrl);

  try {
    const {
      rows: [person],
    } = await client.query(
      `INSERT INTO persons (first_name, last_name, display_name, email, global_identity_id, login_enabled)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [
        admin.first_name,
        admin.last_name,
        admin.full_name,
        admin.email,
        admin.global_identity_id,
      ],
    );
    const personId = person.id as string;

    const { rows: roleRows } = await client.query(
      `SELECT id FROM roles WHERE name = 'Org Admin' AND is_system = true LIMIT 1`,
    );
    if (roleRows.length > 0) {
      await client.query(
        `INSERT INTO staff_assignments (person_id, role_id) VALUES ($1, $2)`,
        [personId, roleRows[0].id],
      );
    }

    return personId;
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Main provisioning orchestrator
// ---------------------------------------------------------------------------

/**
 * Provisions an existing organization that was created via the web UI.
 * Expects the org to be in 'provisioning' status with pending_admin in settings.
 *
 * 1. Creates a Supabase project
 * 2. Waits for it to be healthy
 * 3. Retrieves API keys
 * 4. Runs tenant migrations + seeds
 * 5. Sets up the pending admin (person record, role, identity_org_link)
 * 6. Updates the org record with credentials and marks it active
 *
 * On failure: marks the org as 'archived'.
 */
export async function provisionOrg(orgId: string): Promise<void> {
  const cpDatabaseUrl = process.env.CONTROL_PLANE_DATABASE_URL;
  if (!cpDatabaseUrl)
    throw new Error("CONTROL_PLANE_DATABASE_URL is required");

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) throw new Error("SUPABASE_DB_PASSWORD is required");

  const cpClient = new pg.Client({ connectionString: cpDatabaseUrl });
  await cpClient.connect();

  try {
    const { rows: orgRows } = await cpClient.query(
      `SELECT id, name, slug, status, settings FROM organizations WHERE id = $1`,
      [orgId],
    );
    if (orgRows.length === 0)
      throw new Error(`Organization ${orgId} not found`);

    const org = orgRows[0] as {
      id: string;
      name: string;
      slug: string;
      status: string;
      settings: { pending_admin?: PendingAdmin };
    };

    if (org.status !== "provisioning") {
      throw new Error(
        `Organization is in '${org.status}' status — expected 'provisioning'`,
      );
    }

    console.log(`Provisioning org: ${org.name} (${org.slug})`);

    let projectRef: string | null = null;
    try {
      console.log("Creating Supabase project...");
      const projectName = `sgscore-${org.slug}`;
      const project = await createSupabaseProject(projectName, dbPassword);
      projectRef = project.id;
      console.log(`Created project: ${projectRef}`);

      await waitForProject(projectRef);
      console.log("Project is ready.");

      const keys = await getApiKeys(projectRef);
      const supabaseUrl = `https://${projectRef}.supabase.co`;

      const pooler = await getPoolerHost(projectRef);
      const tenantDbUrl = buildTenantDbUrl(projectRef, dbPassword, pooler.host, pooler.port);
      console.log("Running tenant migrations...");
      await runTenantMigrations(tenantDbUrl, { seed: true });

      if (org.settings?.pending_admin) {
        console.log("Setting up org admin...");
        await setupPendingAdmin(
          cpClient,
          tenantDbUrl,
          orgId,
          org.settings.pending_admin,
        );
      } else {
        console.warn(
          "No pending_admin in settings — skipping admin setup",
        );
      }

      await cpClient.query(
        `UPDATE organizations SET
           supabase_project_id = $1,
           supabase_url = $2,
           supabase_anon_key = $3,
           supabase_service_key = $4,
           database_url = $5,
           status = 'active'
         WHERE id = $6`,
        [projectRef, supabaseUrl, keys.anon, keys.service_role, tenantDbUrl, orgId],
      );

      await cpClient.query(
        `INSERT INTO platform_audit_log (action, resource_type, resource_id, metadata)
         VALUES ('org.provisioned', 'organization', $1, $2)`,
        [orgId, JSON.stringify({ name: org.name, slug: org.slug })],
      );

      console.log(`\nOrg '${org.name}' provisioned successfully.`);
      console.log(`  ID: ${orgId}`);
      console.log(`  Slug: ${org.slug}`);
      console.log(`  URL: ${supabaseUrl}`);
    } catch (err) {
      // Clean up: delete the Supabase project if it was created
      if (projectRef) {
        try {
          await deleteSupabaseProject(projectRef);
        } catch (cleanupErr) {
          console.warn("Failed to clean up Supabase project:", cleanupErr);
        }
      }
      await cpClient.query(
        "UPDATE organizations SET status = 'archived' WHERE id = $1",
        [orgId],
      );
      throw err;
    }
  } finally {
    await cpClient.end();
  }
}
