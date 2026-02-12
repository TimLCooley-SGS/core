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
import type { DonationPageConfig } from "@sgscore/types";
import { DEFAULT_DONATION_PAGE_CONFIG } from "@sgscore/types";

interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireDonationsManage(
  orgSlug: string,
): Promise<{ userId: string; orgId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { userId: user.id, orgId: org.id };

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
    !capabilities.includes("donations.manage") &&
    !capabilities.includes("settings.update")
  ) {
    return {
      error:
        "Not authorized. Requires donations.manage or settings.update capability.",
    };
  }

  return { userId: user.id, orgId: org.id };
}

export async function getDonationPageConfig(
  orgSlug: string,
): Promise<DonationPageConfig> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { ...DEFAULT_DONATION_PAGE_CONFIG };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const saved = settings.donationPage as Partial<DonationPageConfig> | undefined;

  return { ...DEFAULT_DONATION_PAGE_CONFIG, ...saved };
}

export async function updateDonationPageConfig(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const configJson = formData.get("config") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!configJson) return { error: "Missing configuration data." };

  const auth = await requireDonationsManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  let config: DonationPageConfig;
  try {
    config = JSON.parse(configJson);
    if (typeof config.enabled !== "boolean") throw new Error("Invalid enabled");
    if (typeof config.title !== "string" || !config.title.trim())
      throw new Error("Title is required");
    if (!Array.isArray(config.denominations))
      throw new Error("Invalid denominations");
    if (typeof config.minimumCents !== "number" || config.minimumCents < 100)
      throw new Error("Minimum must be at least $1.00");
    if (typeof config.maximumCents !== "number" || config.maximumCents < config.minimumCents)
      throw new Error("Maximum must be greater than minimum");
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Invalid configuration format.",
    };
  }

  const cp = getControlPlaneClient();
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  settings.donationPage = config;

  const { error: updateError } = await cp
    .from("organizations")
    .update({ settings })
    .eq("id", auth.orgId);

  if (updateError) {
    return { error: `Failed to update: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.donation_page_updated",
    resource_type: "organization",
    resource_id: auth.orgId,
    metadata: { enabled: config.enabled, campaignName: config.campaignName },
  });

  revalidatePath(`/org/${orgSlug}/donations`);
  return { success: true };
}
