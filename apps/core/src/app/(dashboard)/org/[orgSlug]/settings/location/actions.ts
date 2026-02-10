"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getTenantClient,
  getSgsStaffByIdentity,
  resolveCapabilityKeys,
} from "@sgscore/api";

interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireSettingsUpdate(
  orgSlug: string,
): Promise<
  { userId: string; orgId: string; tenantPersonId: string | null } | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  // Check if SGS platform staff — they get full access
  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { userId: user.id, orgId: org.id, tenantPersonId: null };

  // Otherwise check org-level capability via identity_org_link
  const cp = getControlPlaneClient();
  const { data: link } = await cp
    .from("identity_org_links")
    .select("tenant_person_id")
    .eq("global_identity_id", user.id)
    .eq("organization_id", org.id)
    .eq("status", "active")
    .single();

  if (!link) return { error: "Not authorized." };

  const tenantClient = getTenantClient(org);
  const capabilities = await resolveCapabilityKeys(
    tenantClient,
    link.tenant_person_id,
  );

  if (!capabilities.includes("settings.update")) {
    return { error: "Not authorized. Requires settings.update capability." };
  }

  return { userId: user.id, orgId: org.id, tenantPersonId: link.tenant_person_id };
}

export async function addLocation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();
  const capacityRaw = formData.get("capacity") as string;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Name is required." };

  const capacity = capacityRaw ? parseInt(capacityRaw, 10) : null;
  if (capacity !== null && (isNaN(capacity) || capacity <= 0)) {
    return { error: "Capacity must be a positive number." };
  }

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: location, error: insertError } = await tenant
    .from("locations")
    .insert({ name, capacity, description })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to add location: ${insertError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "create",
    table_name: "locations",
    record_id: location.id,
    new_values: { name, capacity, description },
  });

  revalidatePath(`/org/${orgSlug}/settings/location`);
  return { success: true };
}

export async function deleteLocation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const locationId = formData.get("locationId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!locationId) return { error: "Missing location ID." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: deleteError } = await tenant
    .from("locations")
    .delete()
    .eq("id", locationId);

  if (deleteError) {
    return { error: `Failed to delete location: ${deleteError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "delete",
    table_name: "locations",
    record_id: locationId,
  });

  revalidatePath(`/org/${orgSlug}/settings/location`);
  return { success: true };
}

export async function addBlockedDate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const locationId = (formData.get("locationId") as string) || null;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!startDate) return { error: "Start date is required." };
  if (!endDate) return { error: "End date is required." };
  if (!reason) return { error: "Reason is required." };
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: blocked, error: insertError } = await tenant
    .from("blocked_dates")
    .insert({
      location_id: locationId || null,
      start_date: startDate,
      end_date: endDate,
      reason,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to add blocked date: ${insertError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "create",
    table_name: "blocked_dates",
    record_id: blocked.id,
    new_values: { location_id: locationId, start_date: startDate, end_date: endDate, reason },
  });

  revalidatePath(`/org/${orgSlug}/settings/location`);
  return { success: true };
}

export async function deleteBlockedDate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const blockedDateId = formData.get("blockedDateId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!blockedDateId) return { error: "Missing blocked date ID." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: deleteError } = await tenant
    .from("blocked_dates")
    .delete()
    .eq("id", blockedDateId);

  if (deleteError) {
    return { error: `Failed to delete blocked date: ${deleteError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "delete",
    table_name: "blocked_dates",
    record_id: blockedDateId,
  });

  revalidatePath(`/org/${orgSlug}/settings/location`);
  return { success: true };
}
