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

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requirePeopleAccess(
  orgSlug: string,
  requiredCap: string,
): Promise<
  | { tenantPersonId: string | null; org: NonNullable<Awaited<ReturnType<typeof getOrgBySlug>>> }
  | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { tenantPersonId: null, org };

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
    !capabilities.includes(requiredCap) &&
    !capabilities.includes("people.manage")
  ) {
    return { error: `Not authorized. Requires ${requiredCap} capability.` };
  }

  return { tenantPersonId: link.tenant_person_id, org };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemEmailTemplate {
  id: string;
  name: string;
  subject: string;
  system_key: string;
  updated_at: string;
}

export interface MembershipEmailRule {
  id: string;
  email_template_id: string;
  template_name: string;
  trigger_event: "purchase" | "expiration";
  offset_days: number;
  is_system: boolean;
  is_active: boolean;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getSystemEmailTemplates(
  orgSlug: string,
): Promise<{ ticket: SystemEmailTemplate[]; membership: SystemEmailTemplate[]; donation: SystemEmailTemplate[] }> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { ticket: [], membership: [], donation: [] };

  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("email_templates")
    .select("id, name, subject, system_key, updated_at")
    .eq("is_system", true)
    .order("name");

  const templates = (data ?? []) as SystemEmailTemplate[];

  const ticket = templates.filter((t) => t.system_key.startsWith("ticket_"));
  const membership = templates.filter((t) => t.system_key.startsWith("membership_"));
  const donation = templates.filter((t) => t.system_key.startsWith("donation_"));

  return { ticket, membership, donation };
}

export async function getMembershipEmailRules(
  orgSlug: string,
): Promise<MembershipEmailRule[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);

  // Supabase doesn't support joins on this table easily, so do 2 queries
  const { data: rules } = await tenant
    .from("membership_email_rules")
    .select("id, email_template_id, trigger_event, offset_days, is_system, is_active")
    .order("trigger_event")
    .order("offset_days");

  if (!rules || rules.length === 0) return [];

  // Get template names
  const templateIds = [...new Set((rules as { email_template_id: string }[]).map((r) => r.email_template_id))];
  const { data: templates } = await tenant
    .from("email_templates")
    .select("id, name")
    .in("id", templateIds);

  const templateMap = new Map<string, string>();
  for (const t of (templates ?? []) as { id: string; name: string }[]) {
    templateMap.set(t.id, t.name);
  }

  return (rules as { id: string; email_template_id: string; trigger_event: "purchase" | "expiration"; offset_days: number; is_system: boolean; is_active: boolean }[]).map((r) => ({
    ...r,
    template_name: templateMap.get(r.email_template_id) ?? "Unknown Template",
  }));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateMembershipEmailRule(
  orgSlug: string,
  ruleId: string,
  data: { offset_days?: number; is_active?: boolean },
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "settings.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const updates: Record<string, unknown> = {};
  if (data.offset_days !== undefined) updates.offset_days = data.offset_days;
  if (data.is_active !== undefined) updates.is_active = data.is_active;

  const { error } = await tenant
    .from("membership_email_rules")
    .update(updates)
    .eq("id", ruleId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/system-emails`);
  return {};
}

export async function createMembershipEmailRule(
  orgSlug: string,
  data: { email_template_id: string; trigger_event: string; offset_days: number },
): Promise<{ id?: string; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "settings.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { data: row, error } = await tenant
    .from("membership_email_rules")
    .insert({
      email_template_id: data.email_template_id,
      trigger_event: data.trigger_event,
      offset_days: data.offset_days,
      is_system: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/system-emails`);
  return { id: row.id as string };
}

export async function deleteMembershipEmailRule(
  orgSlug: string,
  ruleId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "settings.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);

  // Only allow deleting non-system rules
  const { data: rule } = await tenant
    .from("membership_email_rules")
    .select("is_system")
    .eq("id", ruleId)
    .single();

  if (rule?.is_system) return { error: "System rules cannot be deleted." };

  const { error } = await tenant
    .from("membership_email_rules")
    .delete()
    .eq("id", ruleId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/system-emails`);
  return {};
}
