"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getTenantClient,
  getSgsStaffByIdentity,
  resolveCapabilityKeys,
  uploadOrgLogo as uploadLogo,
  deleteOrgLogo as deleteLogo,
} from "@sgscore/api";

interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireSettingsUpdate(
  orgSlug: string,
): Promise<{ userId: string; orgId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  // Check if SGS platform staff — they get full access
  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { userId: user.id, orgId: org.id };

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

  return { userId: user.id, orgId: org.id };
}

export async function updateOrgName(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Name is required." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const cp = getControlPlaneClient();

  const { error: updateError } = await cp
    .from("organizations")
    .update({ name })
    .eq("id", auth.orgId);

  if (updateError) {
    return { error: `Failed to update: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.name_updated",
    resource_type: "organization",
    resource_id: auth.orgId,
    metadata: { name },
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}

export async function uploadOrgLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  let logoUrl: string;
  try {
    logoUrl = await uploadLogo(auth.orgId, file);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }

  // Merge logoUrl into settings.branding
  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = ((settings.branding ?? {}) as Record<string, unknown>);
  branding.logoUrl = logoUrl;
  settings.branding = branding;

  const { error: updateError } = await cp
    .from("organizations")
    .update({ settings })
    .eq("id", auth.orgId);

  if (updateError) {
    return { error: `Failed to save logo URL: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.logo_uploaded",
    resource_type: "organization",
    resource_id: auth.orgId,
    metadata: { logoUrl },
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}

export async function removeOrgLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  if (!orgSlug) return { error: "Missing org slug." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteLogo(auth.orgId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete logo.",
    };
  }

  // Clear logoUrl from settings.branding
  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = ((settings.branding ?? {}) as Record<string, unknown>);
  delete branding.logoUrl;
  settings.branding = branding;

  const { error: updateError } = await cp
    .from("organizations")
    .update({ settings })
    .eq("id", auth.orgId);

  if (updateError) {
    return { error: `Failed to update settings: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.logo_removed",
    resource_type: "organization",
    resource_id: auth.orgId,
    metadata: {},
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}
