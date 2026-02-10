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

export interface DeleteStepResult {
  ok: boolean;
  error?: string;
}

async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized." };
  return { userId: user.id };
}

export async function deleteStep_SupabaseProject(
  orgId: string,
): Promise<DeleteStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("supabase_project_id")
    .eq("id", orgId)
    .single();

  if (org?.supabase_project_id) {
    try {
      await deleteSupabaseProject(org.supabase_project_id);
    } catch (err) {
      console.warn("Failed to delete Supabase project:", err);
    }
  }
  return { ok: true };
}

export async function deleteStep_OrgLinks(
  orgId: string,
): Promise<DeleteStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { error } = await cp
    .from("identity_org_links")
    .delete()
    .eq("organization_id", orgId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteStep_Sessions(
  orgId: string,
): Promise<DeleteStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { error } = await cp
    .from("impersonation_sessions")
    .delete()
    .eq("organization_id", orgId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteStep_OrgRecord(
  orgId: string,
): Promise<DeleteStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { error } = await cp
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteStep_AuditLog(
  orgId: string,
  orgName: string,
  orgSlug: string,
): Promise<DeleteStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.deleted",
    resource_type: "organization",
    resource_id: orgId,
    metadata: { name: orgName, slug: orgSlug },
  });

  return { ok: true };
}
