"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getSgsStaffByIdentity,
  getTenantClient,
  resolveCapabilityKeys,
} from "@sgscore/api";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requireSettingsAccess(orgSlug: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." } as const;

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." } as const;

  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { org } as const;

  const cp = getControlPlaneClient();
  const { data: link } = await cp
    .from("identity_org_links")
    .select("tenant_person_id")
    .eq("global_identity_id", user.id)
    .eq("organization_id", org.id)
    .eq("status", "active")
    .single();

  if (!link) return { error: "Not authorized." } as const;

  const tenantClient = getTenantClient(org);
  const capabilities = await resolveCapabilityKeys(
    tenantClient,
    link.tenant_person_id,
  );

  if (
    !capabilities.includes("settings.update") &&
    !capabilities.includes("settings.manage")
  ) {
    return { error: "Not authorized. Requires settings.update capability." } as const;
  }

  return { org } as const;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getFromEmail(orgSlug: string): Promise<string | null> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const cp = getControlPlaneClient();
  const { data } = await cp
    .from("organizations")
    .select("from_email")
    .eq("id", org.id)
    .single();

  return (data?.from_email as string | null) ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateFromEmail(
  orgSlug: string,
  email: string,
): Promise<{ error?: string }> {
  const auth = await requireSettingsAccess(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const cp = getControlPlaneClient();
  const { error } = await cp
    .from("organizations")
    .update({ from_email: email.trim() || null })
    .eq("id", auth.org.id);

  if (error) return { error: error.message };

  // Audit log
  await cp.from("platform_audit_log").insert({
    action: "org.from_email_updated",
    resource_type: "organization",
    resource_id: auth.org.id,
    metadata: { from_email: email.trim() || null },
  });

  revalidatePath(`/org/${orgSlug}/settings/system/emails`);
  return {};
}
