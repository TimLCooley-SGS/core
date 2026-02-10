import { getControlPlaneClient } from "./control-plane";
import type { SgsStaff, Organization, GlobalIdentity } from "@sgscore/types";

export type StaffWithIdentity = SgsStaff & {
  global_identity: Pick<GlobalIdentity, "primary_email" | "display_name">;
};

/**
 * Returns the active sgs_staff record for a given global identity, or null.
 */
export async function getSgsStaffByIdentity(
  globalIdentityId: string,
): Promise<SgsStaff | null> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from("sgs_staff")
    .select("*")
    .eq("global_identity_id", globalIdentityId)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return data as SgsStaff;
}

/**
 * Returns all organizations (any status), ordered by created_at desc.
 * Admin-only — no status filtering.
 */
export async function getAllOrganizations(): Promise<Organization[]> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);
  return (data ?? []) as Organization[];
}

/**
 * Returns a single organization by ID (any status).
 * Admin-only — no status filtering.
 */
export async function getOrgByIdAdmin(
  id: string,
): Promise<Organization | null> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Organization;
}

/**
 * Returns the count of active identity_org_links for an organization.
 */
export async function getOrgMemberCount(orgId: string): Promise<number> {
  const cp = getControlPlaneClient();
  const { count, error } = await cp
    .from("identity_org_links")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("status", "active");

  if (error) return 0;
  return count ?? 0;
}

/**
 * Returns all sgs_staff records joined with their global_identity.
 * Ordered by created_at desc. Admin-only.
 */
export async function getAllStaff(): Promise<StaffWithIdentity[]> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from("sgs_staff")
    .select("*, global_identity:global_identities!inner(primary_email, display_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`);
  return (data ?? []) as StaffWithIdentity[];
}
