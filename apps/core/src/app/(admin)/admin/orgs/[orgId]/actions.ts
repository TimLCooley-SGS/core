"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";
import { deleteSupabaseProject } from "@sgscore/api/provisioning";
import type { OrgStatus } from "@sgscore/types";

interface UpdateOrgStatusState {
  error?: string;
  success?: boolean;
}

export async function updateOrgStatus(
  _prev: UpdateOrgStatusState,
  formData: FormData,
): Promise<UpdateOrgStatusState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized." };

  const orgId = formData.get("orgId") as string;
  const newStatus = formData.get("status") as OrgStatus;

  if (!orgId || !newStatus) return { error: "Missing parameters." };

  const validStatuses: OrgStatus[] = ["active", "suspended", "archived"];
  if (!validStatuses.includes(newStatus)) {
    return { error: "Invalid status." };
  }

  const cp = getControlPlaneClient();

  const { error: updateError } = await cp
    .from("organizations")
    .update({ status: newStatus })
    .eq("id", orgId);

  if (updateError) {
    return { error: `Failed to update: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: user.id,
    action: `org.status_changed`,
    resource_type: "organization",
    resource_id: orgId,
    metadata: { new_status: newStatus },
  });

  revalidatePath(`/admin/orgs/${orgId}`);
  revalidatePath("/admin/orgs");

  return { success: true };
}

interface DeleteOrgState {
  error?: string;
}

export async function deleteOrganization(
  _prev: DeleteOrgState,
  formData: FormData,
): Promise<DeleteOrgState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized." };

  const orgId = formData.get("orgId") as string;
  if (!orgId) return { error: "Missing organization ID." };

  const cp = getControlPlaneClient();

  // Load the org
  const { data: org, error: orgError } = await cp
    .from("organizations")
    .select("id, name, slug, supabase_project_id")
    .eq("id", orgId)
    .single();

  if (orgError || !org) {
    return { error: "Organization not found." };
  }

  // Delete Supabase project if one exists
  if (org.supabase_project_id) {
    try {
      await deleteSupabaseProject(org.supabase_project_id);
    } catch (err) {
      console.warn("Failed to delete Supabase project:", err);
    }
  }

  // Delete related records, then the org itself
  await cp
    .from("identity_org_links")
    .delete()
    .eq("organization_id", orgId);

  await cp
    .from("impersonation_sessions")
    .delete()
    .eq("organization_id", orgId);

  const { error: deleteError } = await cp
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (deleteError) {
    return { error: `Failed to delete organization: ${deleteError.message}` };
  }

  // Audit log
  await cp.from("platform_audit_log").insert({
    actor_id: user.id,
    action: "org.deleted",
    resource_type: "organization",
    resource_id: orgId,
    metadata: { name: org.name, slug: org.slug },
  });

  redirect("/admin/orgs");
}
