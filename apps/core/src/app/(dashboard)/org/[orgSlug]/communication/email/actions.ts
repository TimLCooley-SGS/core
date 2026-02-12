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
import type { EmailBlock, EmailTemplateSettings } from "@sgscore/types";

// ---------------------------------------------------------------------------
// Auth helper (mirrors contacts/lists/actions.ts)
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

export interface EmailTemplateOverview {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "active" | "archived";
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getEmailTemplates(
  orgSlug: string,
): Promise<EmailTemplateOverview[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("email_templates")
    .select("id, name, subject, status, updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  return (data ?? []) as EmailTemplateOverview[];
}

export async function getEmailTemplate(
  orgSlug: string,
  templateId: string,
): Promise<{
  id: string;
  name: string;
  subject: string;
  preheader: string;
  blocks: EmailBlock[];
  settings: EmailTemplateSettings;
  html_content: string | null;
  status: string;
  created_at: string;
  updated_at: string;
} | null> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!data) return null;

  return {
    ...data,
    blocks: (data.blocks ?? []) as EmailBlock[],
    settings: (data.settings ?? {}) as EmailTemplateSettings,
  } as {
    id: string;
    name: string;
    subject: string;
    preheader: string;
    blocks: EmailBlock[];
    settings: EmailTemplateSettings;
    html_content: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createEmailTemplate(
  orgSlug: string,
  data: {
    name: string;
    subject?: string;
    preheader?: string;
    blocks: EmailBlock[];
    settings: EmailTemplateSettings;
    html_content?: string;
  },
): Promise<{ id?: string; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { data: row, error } = await tenant
    .from("email_templates")
    .insert({
      name: data.name.trim(),
      subject: data.subject?.trim() ?? "",
      preheader: data.preheader?.trim() ?? "",
      blocks: data.blocks as unknown as Record<string, unknown>,
      settings: data.settings as unknown as Record<string, unknown>,
      html_content: data.html_content ?? null,
      created_by: auth.tenantPersonId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return { id: row.id as string };
}

export async function updateEmailTemplate(
  orgSlug: string,
  templateId: string,
  data: {
    name?: string;
    subject?: string;
    preheader?: string;
    blocks?: EmailBlock[];
    settings?: EmailTemplateSettings;
    html_content?: string;
    status?: "draft" | "active" | "archived";
  },
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.subject !== undefined) updates.subject = data.subject.trim();
  if (data.preheader !== undefined) updates.preheader = data.preheader.trim();
  if (data.blocks !== undefined) updates.blocks = data.blocks;
  if (data.settings !== undefined) updates.settings = data.settings;
  if (data.html_content !== undefined) updates.html_content = data.html_content;
  if (data.status !== undefined) updates.status = data.status;

  const { error } = await tenant
    .from("email_templates")
    .update(updates)
    .eq("id", templateId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return {};
}

export async function deleteEmailTemplate(
  orgSlug: string,
  templateId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant
    .from("email_templates")
    .update({ status: "archived" })
    .eq("id", templateId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return {};
}

export async function duplicateEmailTemplate(
  orgSlug: string,
  templateId: string,
): Promise<{ id?: string; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { data: source } = await tenant
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!source) return { error: "Template not found." };

  const { data: row, error } = await tenant
    .from("email_templates")
    .insert({
      name: `Copy of ${source.name}`,
      subject: source.subject,
      preheader: source.preheader,
      blocks: source.blocks,
      settings: source.settings,
      html_content: source.html_content,
      status: "draft",
      created_by: auth.tenantPersonId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return { id: row.id as string };
}
