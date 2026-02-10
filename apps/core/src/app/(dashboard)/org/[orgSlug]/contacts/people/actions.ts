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

async function requirePeopleUpdate(
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

  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { userId: user.id, orgId: org.id, tenantPersonId: null };

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

  if (
    !capabilities.includes("people.update") &&
    !capabilities.includes("people.manage")
  ) {
    return { error: "Not authorized. Requires people.update capability." };
  }

  return { userId: user.id, orgId: org.id, tenantPersonId: link.tenant_person_id };
}

export async function bulkUpdateStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const personIdsRaw = formData.get("personIds") as string;
  const status = formData.get("status") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!personIdsRaw) return { error: "No persons selected." };
  if (status !== "active" && status !== "inactive") {
    return { error: "Invalid status. Must be active or inactive." };
  }

  const personIds = personIdsRaw.split(",").filter(Boolean);
  if (personIds.length === 0) return { error: "No persons selected." };

  const auth = await requirePeopleUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: updateError } = await tenant
    .from("persons")
    .update({ status, updated_by: auth.tenantPersonId })
    .in("id", personIds)
    .neq("status", "merged");

  if (updateError) {
    return { error: `Failed to update: ${updateError.message}` };
  }

  // Audit log: one entry per person for SOC2 traceability
  const auditEntries = personIds.map((personId) => ({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "persons",
    record_id: personId,
    new_values: { status },
  }));

  await tenant.from("audit_log").insert(auditEntries);

  revalidatePath(`/org/${orgSlug}/contacts/people`);
  return { success: true };
}
