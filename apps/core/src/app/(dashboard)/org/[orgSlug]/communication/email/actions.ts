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
import type {
  EmailBlock,
  EmailTemplateSettings,
  ContactList,
  FilterRules,
} from "@sgscore/types";

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
  folder_id: string | null;
  updated_at: string;
  is_system: boolean;
}

export interface EmailFolder {
  id: string;
  name: string;
  template_count: number;
  is_system: boolean;
}

export interface SendableList {
  id: string;
  name: string;
  type: "smart" | "static";
  member_count: number;
}

// ---------------------------------------------------------------------------
// Template queries
// ---------------------------------------------------------------------------

export async function getEmailTemplates(
  orgSlug: string,
): Promise<EmailTemplateOverview[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("email_templates")
    .select("id, name, subject, folder_id, updated_at, is_system")
    .neq("status", "archived")
    .eq("is_system", false)
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
  folder_id: string | null;
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
    folder_id: string | null;
    created_at: string;
    updated_at: string;
  };
}

// ---------------------------------------------------------------------------
// Template mutations
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
    folder_id?: string | null;
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
      folder_id: data.folder_id ?? null,
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
    folder_id?: string | null;
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
  if (data.folder_id !== undefined) updates.folder_id = data.folder_id;

  const { error } = await tenant
    .from("email_templates")
    .update(updates)
    .eq("id", templateId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteEmailTemplate(
  orgSlug: string,
  templateId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);

  // Check if system template
  const { data: tpl } = await tenant
    .from("email_templates")
    .select("is_system")
    .eq("id", templateId)
    .single();
  if (tpl?.is_system) return { error: "System templates cannot be deleted." };

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
      folder_id: source.folder_id,
      created_by: auth.tenantPersonId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return { id: row.id as string };
}

export async function moveEmailTemplate(
  orgSlug: string,
  templateId: string,
  folderId: string | null,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);

  // Check if system template
  const { data: tpl } = await tenant
    .from("email_templates")
    .select("is_system")
    .eq("id", templateId)
    .single();
  if (tpl?.is_system) return { error: "System templates cannot be moved." };

  const { error } = await tenant
    .from("email_templates")
    .update({ folder_id: folderId })
    .eq("id", templateId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return {};
}

// ---------------------------------------------------------------------------
// Folder CRUD
// ---------------------------------------------------------------------------

export async function getEmailFolders(
  orgSlug: string,
): Promise<EmailFolder[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);
  const { data: folders } = await tenant
    .from("email_template_folders")
    .select("id, name, is_system")
    .eq("is_system", false)
    .order("name");

  if (!folders || folders.length === 0) return [];

  // Count templates per folder
  const { data: templates } = await tenant
    .from("email_templates")
    .select("folder_id")
    .neq("status", "archived")
    .not("folder_id", "is", null);

  const counts = new Map<string, number>();
  for (const t of (templates ?? []) as { folder_id: string }[]) {
    counts.set(t.folder_id, (counts.get(t.folder_id) ?? 0) + 1);
  }

  return folders.map((f) => ({
    id: f.id as string,
    name: f.name as string,
    template_count: counts.get(f.id as string) ?? 0,
    is_system: (f.is_system as boolean) ?? false,
  }));
}

export async function createEmailFolder(
  orgSlug: string,
  name: string,
): Promise<{ id?: string; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { data, error } = await tenant
    .from("email_template_folders")
    .insert({ name: name.trim() })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return { id: data.id as string };
}

export async function deleteEmailFolder(
  orgSlug: string,
  folderId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);

  // Check if system folder
  const { data: folder } = await tenant
    .from("email_template_folders")
    .select("is_system")
    .eq("id", folderId)
    .single();
  if (folder?.is_system) return { error: "System folders cannot be deleted." };

  // Templates in this folder get folder_id set to NULL (ON DELETE SET NULL)
  const { error } = await tenant
    .from("email_template_folders")
    .delete()
    .eq("id", folderId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/communication/email`);
  return {};
}

// ---------------------------------------------------------------------------
// Send to list
// ---------------------------------------------------------------------------

export async function getSendableLists(
  orgSlug: string,
): Promise<SendableList[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);
  const { data: lists } = await tenant
    .from("contact_lists")
    .select("id, name, type")
    .order("name");

  if (!lists || lists.length === 0) return [];

  // Get static member counts
  const staticIds = lists
    .filter((l: { type: string }) => l.type === "static")
    .map((l: { id: string }) => l.id);

  const staticCounts = new Map<string, number>();
  if (staticIds.length > 0) {
    const { data: members } = await tenant
      .from("contact_list_members")
      .select("list_id")
      .in("list_id", staticIds);

    for (const m of (members ?? []) as { list_id: string }[]) {
      staticCounts.set(m.list_id, (staticCounts.get(m.list_id) ?? 0) + 1);
    }
  }

  // For smart lists, get approximate counts
  const result: SendableList[] = [];
  for (const list of lists as { id: string; name: string; type: "smart" | "static" }[]) {
    let member_count = 0;
    if (list.type === "static") {
      member_count = staticCounts.get(list.id) ?? 0;
    } else {
      const { count } = await tenant
        .from("persons")
        .select("id", { count: "exact", head: true })
        .neq("status", "merged")
        .not("email", "is", null);
      member_count = count ?? 0;
    }
    result.push({ id: list.id, name: list.name, type: list.type, member_count });
  }

  return result;
}

export async function sendEmailToList(
  orgSlug: string,
  templateId: string,
  listId: string,
): Promise<{ sent: number; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { sent: 0, error: auth.error };

  const tenant = getTenantClient(auth.org);

  // Get template
  const { data: template } = await tenant
    .from("email_templates")
    .select("name, subject, html_content")
    .eq("id", templateId)
    .single();

  if (!template) return { sent: 0, error: "Template not found." };
  if (!template.html_content) return { sent: 0, error: "Template has no rendered HTML. Open and save it first." };

  // Get list info
  const { data: list } = await tenant
    .from("contact_lists")
    .select("id, name, type, filter_rules")
    .eq("id", listId)
    .single();

  if (!list) return { sent: 0, error: "List not found." };

  // Get recipients
  let emails: string[] = [];
  const contactList = list as ContactList;

  if (contactList.type === "static") {
    const { data: members } = await tenant
      .from("contact_list_members")
      .select("person:persons(email)")
      .eq("list_id", listId);

    emails = (members ?? [])
      .map((m: unknown) => (m as { person: { email: string | null } }).person?.email)
      .filter((e): e is string => !!e);
  } else {
    // Smart list — get all non-merged persons with emails
    // (simplified — full smart filter would need applySmartFilters)
    let query = tenant
      .from("persons")
      .select("email")
      .neq("status", "merged")
      .not("email", "is", null);

    const { data: persons } = await query;
    emails = (persons ?? [])
      .map((p: { email: string | null }) => p.email)
      .filter((e): e is string => !!e);
  }

  if (emails.length === 0) {
    return { sent: 0, error: "No contacts with email addresses in this list." };
  }

  // TODO: Integrate with SendGrid to actually send emails
  // For now, return the count that would be sent
  console.log(`[SendEmail] Would send "${template.subject}" to ${emails.length} recipients from list "${list.name}"`);

  return { sent: emails.length };
}
