"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getTenantClient,
  getSgsStaffByIdentity,
  resolveCapabilityKeys,
  uploadOrgLogoVariant,
  deleteOrgLogoVariant,
} from "@sgscore/api";
import type { LogoVariant, PosNavItem } from "@sgscore/types";
import { LOGO_VARIANT_KEYS } from "@sgscore/types";

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

const VALID_VARIANTS: LogoVariant[] = ["primary", "wide", "square", "favicon"];

export async function uploadOrgLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const file = formData.get("file") as File | null;
  const variant = (formData.get("variant") as LogoVariant) || "primary";

  if (!orgSlug) return { error: "Missing org slug." };
  if (!file || file.size === 0) return { error: "No file provided." };
  if (!VALID_VARIANTS.includes(variant))
    return { error: "Invalid logo variant." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  let logoUrl: string;
  try {
    logoUrl = await uploadOrgLogoVariant(auth.orgId, variant, file);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }

  // Merge URL into the correct branding key
  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Record<string, unknown>;
  const brandingKey = LOGO_VARIANT_KEYS[variant];
  branding[brandingKey] = logoUrl;
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
    metadata: { variant, logoUrl },
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}

export async function removeOrgLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const variant = (formData.get("variant") as LogoVariant) || "primary";

  if (!orgSlug) return { error: "Missing org slug." };
  if (!VALID_VARIANTS.includes(variant))
    return { error: "Invalid logo variant." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteOrgLogoVariant(auth.orgId, variant);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete logo.",
    };
  }

  // Clear the URL from the correct branding key
  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Record<string, unknown>;
  const brandingKey = LOGO_VARIANT_KEYS[variant];
  delete branding[brandingKey];
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
    metadata: { variant },
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateBrandingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  if (!orgSlug) return { error: "Missing org slug." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const primaryColor = (formData.get("primaryColor") as string)?.trim();
  const secondaryColor = (formData.get("secondaryColor") as string)?.trim();
  const accentColor = (formData.get("accentColor") as string)?.trim();
  const headingFont = (formData.get("headingFont") as string)?.trim();
  const bodyFont = (formData.get("bodyFont") as string)?.trim();
  const borderRadius = (formData.get("borderRadius") as string)?.trim();

  // Validate hex colors
  for (const [label, val] of [
    ["Primary color", primaryColor],
    ["Secondary color", secondaryColor],
    ["Accent color", accentColor],
  ] as const) {
    if (val && !HEX_RE.test(val)) {
      return { error: `${label} must be a valid hex color (e.g. #702B9E).` };
    }
  }

  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Record<string, unknown>;

  if (primaryColor) branding.primaryColor = primaryColor;
  if (secondaryColor) branding.secondaryColor = secondaryColor;
  if (accentColor) branding.accentColor = accentColor;
  if (headingFont) branding.headingFont = headingFont;
  if (bodyFont) branding.bodyFont = bodyFont;
  if (borderRadius) branding.borderRadius = borderRadius;

  settings.branding = branding;

  const { error: updateError } = await cp
    .from("organizations")
    .update({ settings })
    .eq("id", auth.orgId);

  if (updateError) {
    return { error: `Failed to update branding: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.branding_updated",
    resource_type: "organization",
    resource_id: auth.orgId,
    metadata: {
      primaryColor,
      secondaryColor,
      accentColor,
      headingFont,
      bodyFont,
      borderRadius,
    },
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}

export async function updatePosNavigationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const navJson = formData.get("navigation") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!navJson) return { error: "Missing navigation data." };

  const auth = await requireSettingsUpdate(orgSlug);
  if ("error" in auth) return { error: auth.error };

  let navItems: PosNavItem[];
  try {
    navItems = JSON.parse(navJson);
    if (!Array.isArray(navItems)) throw new Error("Not an array");
    for (const item of navItems) {
      if (
        typeof item.key !== "string" ||
        typeof item.label !== "string" ||
        typeof item.visible !== "boolean" ||
        typeof item.order !== "number"
      ) {
        throw new Error("Invalid item structure");
      }
    }
  } catch {
    return { error: "Invalid navigation data format." };
  }

  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  settings.posNavigation = navItems;

  const { error: updateError } = await cp
    .from("organizations")
    .update({ settings })
    .eq("id", auth.orgId);

  if (updateError) {
    return { error: `Failed to update navigation: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.pos_navigation_updated",
    resource_type: "organization",
    resource_id: auth.orgId,
    metadata: { itemCount: navItems.length },
  });

  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}
