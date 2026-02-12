"use server";

import { revalidatePath } from "next/cache";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { requireMembershipManage } from "@/lib/auth-guards";

interface ActionState {
  error?: string;
  success?: boolean;
  planId?: string;
}

export async function createMembershipPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Plan name is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const priceCents = parseInt(formData.get("priceCents") as string, 10);
  if (isNaN(priceCents) || priceCents < 0) {
    return { error: "Price must be a non-negative number." };
  }

  const durationDays = parseInt(formData.get("durationDays") as string, 10);
  if (isNaN(durationDays) || durationDays <= 0) {
    return { error: "Duration must be a positive number of days." };
  }

  const seatCount = parseInt(formData.get("seatCount") as string, 10);
  if (isNaN(seatCount) || seatCount <= 0) {
    return { error: "Seat count must be a positive number." };
  }

  const planData = {
    name,
    description: (formData.get("description") as string)?.trim() || null,
    price_cents: priceCents,
    duration_days: durationDays,
    seat_count: seatCount,
    is_recurring: formData.get("isRecurring") === "true",
    status: "active" as const,
  };

  const { data: newPlan, error: insertError } = await tenant
    .from("membership_plans")
    .insert(planData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create plan: ${insertError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "membership_plans",
    record_id: newPlan.id,
    new_values: planData,
  });

  revalidatePath(`/org/${orgSlug}/memberships/plans`);
  return { success: true, planId: newPlan.id };
}

export async function updateMembershipPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const planId = formData.get("planId") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!planId) return { error: "Missing plan ID." };
  if (!name) return { error: "Plan name is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("membership_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!existing) return { error: "Plan not found." };

  const priceCents = parseInt(formData.get("priceCents") as string, 10);
  if (isNaN(priceCents) || priceCents < 0) {
    return { error: "Price must be a non-negative number." };
  }

  const durationDays = parseInt(formData.get("durationDays") as string, 10);
  if (isNaN(durationDays) || durationDays <= 0) {
    return { error: "Duration must be a positive number of days." };
  }

  const seatCount = parseInt(formData.get("seatCount") as string, 10);
  if (isNaN(seatCount) || seatCount <= 0) {
    return { error: "Seat count must be a positive number." };
  }

  const updates = {
    name,
    description: (formData.get("description") as string)?.trim() || null,
    price_cents: priceCents,
    duration_days: durationDays,
    seat_count: seatCount,
    is_recurring: formData.get("isRecurring") === "true",
  };

  const { error: updateError } = await tenant
    .from("membership_plans")
    .update(updates)
    .eq("id", planId);

  if (updateError) {
    return { error: `Failed to update plan: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "membership_plans",
    record_id: planId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/memberships/plans`);
  revalidatePath(`/org/${orgSlug}/memberships/plans/${planId}`);
  return { success: true, planId };
}

export async function archiveMembershipPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const planId = formData.get("planId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!planId) return { error: "Missing plan ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("membership_plans")
    .select("status")
    .eq("id", planId)
    .single();

  if (!existing) return { error: "Plan not found." };

  const { error: updateError } = await tenant
    .from("membership_plans")
    .update({ status: "archived" })
    .eq("id", planId);

  if (updateError) {
    return { error: `Failed to archive plan: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "membership_plans",
    record_id: planId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/memberships/plans`);
  return { success: true };
}

export async function activateMembershipPlan(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const planId = formData.get("planId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!planId) return { error: "Missing plan ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("membership_plans")
    .select("status")
    .eq("id", planId)
    .single();

  if (!existing) return { error: "Plan not found." };

  const { error: updateError } = await tenant
    .from("membership_plans")
    .update({ status: "active" })
    .eq("id", planId);

  if (updateError) {
    return { error: `Failed to activate plan: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "membership_plans",
    record_id: planId,
    old_values: { status: existing.status },
    new_values: { status: "active" },
  });

  revalidatePath(`/org/${orgSlug}/memberships/plans`);
  return { success: true };
}
