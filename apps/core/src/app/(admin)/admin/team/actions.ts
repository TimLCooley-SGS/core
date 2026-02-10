"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";
import type { SgsStaffRole } from "@sgscore/types";

interface ActionState {
  error?: string;
  success?: boolean;
}

const VALID_ROLES: SgsStaffRole[] = ["admin", "support", "engineering", "billing"];

async function requireAdminStaff(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff || staff.role !== "admin") return { error: "Not authorized. Admin role required." };

  return { userId: user.id };
}

export async function addTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminStaff();
  if ("error" in auth) return { error: auth.error };

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const displayName = (formData.get("displayName") as string)?.trim() || null;
  const role = formData.get("role") as SgsStaffRole;

  if (!email) return { error: "Email is required." };
  if (!role || !VALID_ROLES.includes(role)) return { error: "Invalid role." };

  const cp = getControlPlaneClient();

  // Find or create the global identity
  const { data: existing } = await cp
    .from("global_identities")
    .select("id")
    .eq("primary_email", email)
    .single();

  let globalIdentityId: string;

  if (existing) {
    globalIdentityId = existing.id;

    // Update display name if provided
    if (displayName) {
      await cp
        .from("global_identities")
        .update({ display_name: displayName })
        .eq("id", globalIdentityId);
    }
  } else {
    // Create a new global identity
    const { data: newIdentity, error: identityError } = await cp
      .from("global_identities")
      .insert({ primary_email: email, display_name: displayName })
      .select("id")
      .single();

    if (identityError || !newIdentity) {
      return { error: `Failed to create identity: ${identityError?.message ?? "Unknown error"}` };
    }
    globalIdentityId = newIdentity.id;
  }

  // Check if already staff
  const { data: existingStaff } = await cp
    .from("sgs_staff")
    .select("id, status")
    .eq("global_identity_id", globalIdentityId)
    .single();

  if (existingStaff) {
    if (existingStaff.status === "active") {
      return { error: "This person is already an active team member." };
    }
    // Re-activate inactive staff
    const { error: reactivateError } = await cp
      .from("sgs_staff")
      .update({ status: "active", role })
      .eq("id", existingStaff.id);

    if (reactivateError) {
      return { error: `Failed to re-activate: ${reactivateError.message}` };
    }
  } else {
    const { error: insertError } = await cp
      .from("sgs_staff")
      .insert({ global_identity_id: globalIdentityId, role, status: "active" });

    if (insertError) {
      return { error: `Failed to add team member: ${insertError.message}` };
    }
  }

  // Audit log
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "staff.added",
    resource_type: "sgs_staff",
    resource_id: globalIdentityId,
    metadata: { email, role },
  });

  revalidatePath("/admin/team");
  return { success: true };
}

export async function removeTeamMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminStaff();
  if ("error" in auth) return { error: auth.error };

  const staffId = formData.get("staffId") as string;
  if (!staffId) return { error: "Missing staff ID." };

  const cp = getControlPlaneClient();

  const { error: updateError } = await cp
    .from("sgs_staff")
    .update({ status: "inactive" })
    .eq("id", staffId);

  if (updateError) {
    return { error: `Failed to remove: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "staff.removed",
    resource_type: "sgs_staff",
    resource_id: staffId,
    metadata: {},
  });

  revalidatePath("/admin/team");
  return { success: true };
}

export async function updateTeamMemberRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminStaff();
  if ("error" in auth) return { error: auth.error };

  const staffId = formData.get("staffId") as string;
  const newRole = formData.get("role") as SgsStaffRole;

  if (!staffId) return { error: "Missing staff ID." };
  if (!newRole || !VALID_ROLES.includes(newRole)) return { error: "Invalid role." };

  const cp = getControlPlaneClient();

  const { error: updateError } = await cp
    .from("sgs_staff")
    .update({ role: newRole })
    .eq("id", staffId);

  if (updateError) {
    return { error: `Failed to update role: ${updateError.message}` };
  }

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "staff.role_changed",
    resource_type: "sgs_staff",
    resource_id: staffId,
    metadata: { new_role: newRole },
  });

  revalidatePath("/admin/team");
  return { success: true };
}
