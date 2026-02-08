// Control Plane database types

export type OrgStatus = 'provisioning' | 'active' | 'suspended' | 'archived';
export type IdentityOrgLinkStatus = 'active' | 'suspended' | 'removed';
export type SgsStaffRole = 'admin' | 'support' | 'engineering' | 'billing';
export type SgsStaffStatus = 'active' | 'inactive';
export type ImpersonationStatus = 'active' | 'ended' | 'timed_out';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  supabase_project_id: string | null;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  supabase_service_key: string | null;
  status: OrgStatus;
  plan_tier: string | null;
  stripe_connect_account_id: string | null;
  stripe_onboarding_complete: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GlobalIdentity {
  id: string;
  primary_email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdentityOrgLink {
  id: string;
  global_identity_id: string;
  organization_id: string;
  tenant_person_id: string;
  has_staff_access: boolean;
  has_patron_access: boolean;
  status: IdentityOrgLinkStatus;
  created_at: string;
}

export interface SgsStaff {
  id: string;
  global_identity_id: string;
  role: SgsStaffRole;
  status: SgsStaffStatus;
  created_at: string;
  updated_at: string;
}

export interface ImpersonationSession {
  id: string;
  sgs_staff_id: string;
  organization_id: string;
  target_person_id: string;
  reason: string;
  started_at: string;
  ended_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status: ImpersonationStatus;
}

export interface PlatformAuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
