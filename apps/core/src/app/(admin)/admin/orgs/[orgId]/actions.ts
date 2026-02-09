"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";
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
