"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getTenantClient,
  getSgsStaffByIdentity,
  resolveCapabilityKeys,
  sendEmail,
  emailLayout,
} from "@sgscore/api";
import type { OrgBranding } from "@sgscore/types";

interface ActionState {
  error?: string;
  warning?: string;
  success?: boolean;
}

async function requireStaffManage(
  orgSlug: string,
): Promise<
  { userId: string; orgId: string; tenantPersonId: string | null } | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { userId: user.id, orgId: org.id, tenantPersonId: null };

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

  if (!capabilities.includes("staff.manage")) {
    return { error: "Not authorized. Requires staff.manage capability." };
  }

  return { userId: user.id, orgId: org.id, tenantPersonId: link.tenant_person_id };
}

export async function addStaffAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const roleId = formData.get("roleId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!email) return { error: "Email is required." };
  if (!firstName) return { error: "First name is required." };
  if (!lastName) return { error: "Last name is required." };
  if (!roleId) return { error: "Please select a role." };

  const auth = await requireStaffManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  // Find existing person by email, or create a new one
  let personId: string;

  const { data: existingPerson } = await tenant
    .from("persons")
    .select("id")
    .eq("email", email)
    .eq("status", "active")
    .single();

  if (existingPerson) {
    personId = existingPerson.id;
  } else {
    const { data: newPerson, error: personError } = await tenant
      .from("persons")
      .insert({ first_name: firstName, last_name: lastName, email })
      .select("id")
      .single();

    if (personError) {
      return { error: `Failed to create person: ${personError.message}` };
    }
    personId = newPerson.id;
  }

  // Check for existing active assignment
  const { data: existing } = await tenant
    .from("staff_assignments")
    .select("id")
    .eq("person_id", personId)
    .eq("status", "active")
    .single();

  if (existing) {
    return { error: "This person already has an active staff assignment." };
  }

  const { data: assignment, error: insertError } = await tenant
    .from("staff_assignments")
    .insert({ person_id: personId, role_id: roleId, status: "active" })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to add staff: ${insertError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "create",
    table_name: "staff_assignments",
    record_id: assignment.id,
    new_values: { person_id: personId, role_id: roleId, email, first_name: firstName, last_name: lastName },
  });

  // Send welcome email
  try {
    const { data: role } = await tenant
      .from("roles")
      .select("name")
      .eq("id", roleId)
      .single();

    const roleName = role?.name ?? "Staff";
    const branding = (org.settings?.branding ?? {}) as Partial<OrgBranding>;
    const primaryColor = branding.primaryColor ?? "#702B9E";
    const logoUrl = branding.logoUrl;

    const body = `
      <h1 style="margin:0 0 8px;font-size:22px;color:${primaryColor};">Welcome to the Team!</h1>
      <p style="margin:0 0 16px;color:#555;">You've been added to <strong>${org.name}</strong> as <strong>${roleName}</strong>.</p>
      <p style="margin:0 0 24px;color:#555;">Sign in to get started.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="https://app.sgscore.com" style="display:inline-block;padding:12px 32px;background:${primaryColor};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Sign In</a>
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#999;">If you didn't expect this email, you can safely ignore it.</p>`;

    const html = emailLayout(org.name, logoUrl, primaryColor, body);

    await sendEmail({
      to: email,
      subject: `You've been added to ${org.name}`,
      html,
    });
  } catch (emailErr) {
    const msg = emailErr instanceof Error ? emailErr.message : "Unknown error";
    revalidatePath(`/org/${orgSlug}/settings/team`);
    return { success: true, warning: `Staff added but welcome email failed: ${msg}` };
  }

  revalidatePath(`/org/${orgSlug}/settings/team`);
  return { success: true };
}

export async function removeStaffAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const assignmentId = formData.get("assignmentId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!assignmentId) return { error: "Missing assignment ID." };

  const auth = await requireStaffManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: updateError } = await tenant
    .from("staff_assignments")
    .update({ status: "inactive", ended_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (updateError) {
    return { error: `Failed to deactivate: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "update",
    table_name: "staff_assignments",
    record_id: assignmentId,
    new_values: { status: "inactive" },
  });

  revalidatePath(`/org/${orgSlug}/settings/team`);
  return { success: true };
}

export async function deleteStaffAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const assignmentId = formData.get("assignmentId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!assignmentId) return { error: "Missing assignment ID." };

  const auth = await requireStaffManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: deleteError } = await tenant
    .from("staff_assignments")
    .delete()
    .eq("id", assignmentId);

  if (deleteError) {
    return { error: `Failed to delete: ${deleteError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "delete",
    table_name: "staff_assignments",
    record_id: assignmentId,
  });

  revalidatePath(`/org/${orgSlug}/settings/team`);
  return { success: true };
}

export async function updateStaffRole(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const assignmentId = formData.get("assignmentId") as string;
  const roleId = formData.get("roleId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!assignmentId) return { error: "Missing assignment ID." };
  if (!roleId) return { error: "Missing role." };

  const auth = await requireStaffManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: updateError } = await tenant
    .from("staff_assignments")
    .update({ role_id: roleId })
    .eq("id", assignmentId);

  if (updateError) {
    return { error: `Failed to update role: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : "sgs_support",
    action: "update",
    table_name: "staff_assignments",
    record_id: assignmentId,
    new_values: { role_id: roleId },
  });

  revalidatePath(`/org/${orgSlug}/settings/team`);
  return { success: true };
}
