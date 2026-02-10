"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity, sendEmail } from "@sgscore/api";
import type { SgsStaffRole } from "@sgscore/types";

interface ActionState {
  error?: string;
  warning?: string;
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

  // Create auth user (or find existing) — global_identities.id must match auth.users.id
  let authUserId: string;

  const { data: createData, error: createError } =
    await cp.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: displayName ? { display_name: displayName } : undefined,
    });

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      const { data: listData, error: listError } =
        await cp.auth.admin.listUsers();
      if (listError) {
        return { error: `Failed to look up existing user: ${listError.message}` };
      }
      const existingUser = listData.users.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (!existingUser) {
        return { error: "User appears to exist but could not be found." };
      }
      authUserId = existingUser.id;
    } else {
      return { error: `Failed to create user: ${createError.message}` };
    }
  } else {
    authUserId = createData.user.id;
  }

  // Upsert global identity (id must match auth.users.id)
  const { error: identityError } = await cp.from("global_identities").upsert(
    { id: authUserId, primary_email: email, display_name: displayName },
    { onConflict: "id" },
  );

  if (identityError) {
    return { error: `Failed to create identity: ${identityError.message}` };
  }

  const globalIdentityId = authUserId;

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

  // Send welcome email with magic link
  try {
    const { data: linkData, error: linkError } = await cp.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const magicLink = linkError ? null : linkData?.properties?.action_link;
    const roleName = role.charAt(0).toUpperCase() + role.slice(1);

    await sendEmail({
      to: email,
      subject: "You've been added to the SGS Platform Team",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 32px;background:#702B9E;text-align:center;">
          <h2 style="margin:0;color:#ffffff;">SGS Platform</h2>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#702B9E;">Welcome to the Team!</h1>
          <p style="margin:0 0 16px;color:#555;">You've been added to the SGS platform team as <strong>${roleName}</strong>.</p>
          <p style="margin:0 0 24px;color:#555;">Click the button below to sign in and get started.</p>
          ${magicLink ? `<p style="text-align:center;margin:24px 0;"><a href="${magicLink}" style="display:inline-block;padding:12px 32px;background:#702B9E;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Sign In to SGS Platform</a></p>` : `<p style="margin:0 0 16px;color:#555;">Visit <strong>app.sgscore.com</strong> and sign in with this email address to get started.</p>`}
          <p style="margin:16px 0 0;font-size:13px;color:#999;">If you didn't expect this email, you can safely ignore it.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center;">
          Sent by <a href="https://sgscore.com" style="color:#702B9E;text-decoration:none;">SGS Core</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : "Unknown error";
    revalidatePath("/admin/team");
    return { success: true, warning: `Member added but welcome email failed: ${msg}` };
  }

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
