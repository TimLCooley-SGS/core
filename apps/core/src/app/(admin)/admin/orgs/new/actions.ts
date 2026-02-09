"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";

interface CreateOrgState {
  error?: string;
}

export async function createOrganization(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized." };

  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const planTier = (formData.get("plan_tier") as string)?.trim() || null;

  if (!name || !slug) {
    return { error: "Name and slug are required." };
  }

  // Validate slug format (matches DB constraint)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3 || slug.length > 63) {
    return {
      error:
        "Slug must be 3-63 characters, lowercase alphanumeric and hyphens, cannot start or end with a hyphen.",
    };
  }

  const cp = getControlPlaneClient();

  // Check slug uniqueness
  const { data: existing } = await cp
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return { error: "An organization with this slug already exists." };
  }

  // Create the organization
  const { data: org, error: insertError } = await cp
    .from("organizations")
    .insert({
      name,
      slug,
      plan_tier: planTier,
      status: "provisioning",
    })
    .select("id")
    .single();

  if (insertError || !org) {
    return { error: `Failed to create organization: ${insertError?.message ?? "Unknown error"}` };
  }

  // Write audit log
  await cp.from("platform_audit_log").insert({
    actor_id: user.id,
    action: "org.created",
    resource_type: "organization",
    resource_id: org.id,
    metadata: { name, slug, plan_tier: planTier },
  });

  redirect(`/admin/orgs/${org.id}`);
}
