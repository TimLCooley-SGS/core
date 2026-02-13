"use server";

import { revalidatePath } from "next/cache";
import {
  getOrgBySlug,
  getTenantClient,
  uploadPortalImage,
  deletePortalImage,
  uploadModuleFile,
  deleteModuleFile,
  uploadModuleThumbnail,
  deleteModuleThumbnail,
} from "@sgscore/api";
import { requireMembershipManage } from "@/lib/auth-guards";

interface ActionState {
  error?: string;
  success?: boolean;
  moduleId?: string;
  imageUrl?: string;
  fileUrl?: string;
}

// ---------------------------------------------------------------------------
// Portal Settings / Designer
// ---------------------------------------------------------------------------

export async function upsertPortalSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  if (!orgSlug) return { error: "Missing org slug." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const settingsId = formData.get("settingsId") as string | null;

  const values = {
    welcome_heading: (formData.get("welcomeHeading") as string) || "Welcome to Your Membership Portal",
    welcome_body: (formData.get("welcomeBody") as string) || "",
    button_text: (formData.get("buttonText") as string) || "Sign In",
    helper_text: (formData.get("helperText") as string) || "",
    accent_color: (formData.get("accentColor") as string) || "#4E2C70",
    is_published: formData.get("isPublished") === "true",
    restricted_card_design_ids: parseIds(formData.get("restrictedCardDesignIds") as string),
    updated_by: auth.tenantPersonId,
  };

  if (settingsId) {
    const { data: existing } = await tenant
      .from("portal_settings")
      .select("*")
      .eq("id", settingsId)
      .single();

    const { error } = await tenant
      .from("portal_settings")
      .update(values)
      .eq("id", settingsId);

    if (error) return { error: `Failed to save: ${error.message}` };

    // Upload hero image if provided with update
    const heroFile = formData.get("heroFile") as File | null;
    if (heroFile && heroFile.size > 0) {
      try {
        const publicUrl = await uploadPortalImage(org.id, heroFile);
        await tenant
          .from("portal_settings")
          .update({ hero_image_url: publicUrl, updated_by: auth.tenantPersonId })
          .eq("id", settingsId);
      } catch {
        // non-fatal
      }
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_settings",
      record_id: settingsId,
      old_values: existing,
      new_values: values,
    });
  } else {
    const { data: newRow, error } = await tenant
      .from("portal_settings")
      .insert({ ...values, created_by: auth.tenantPersonId })
      .select("id")
      .single();

    if (error) return { error: `Failed to save: ${error.message}` };

    // Upload hero image if provided with create
    const heroFile = formData.get("heroFile") as File | null;
    if (heroFile && heroFile.size > 0) {
      try {
        const publicUrl = await uploadPortalImage(org.id, heroFile);
        await tenant
          .from("portal_settings")
          .update({ hero_image_url: publicUrl, updated_by: auth.tenantPersonId })
          .eq("id", newRow.id);
      } catch {
        // non-fatal
      }
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "create" as const,
      table_name: "portal_settings",
      record_id: newRow.id,
      new_values: values,
    });
  }

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

export async function uploadPortalHeroImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const settingsId = formData.get("settingsId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!settingsId) return { error: "Save portal settings first." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadPortalImage(org.id, file);

    const tenant = getTenantClient(org);
    const { error } = await tenant
      .from("portal_settings")
      .update({ hero_image_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", settingsId);

    if (error) return { error: `Failed to save image URL: ${error.message}` };

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_settings",
      record_id: settingsId,
      new_values: { hero_image_url: publicUrl },
    });

    revalidatePath(`/org/${orgSlug}/memberships/portal`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removePortalHeroImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const settingsId = formData.get("settingsId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!settingsId) return { error: "Missing settings ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deletePortalImage(org.id);

    const tenant = getTenantClient(org);
    const { error } = await tenant
      .from("portal_settings")
      .update({ hero_image_url: null, updated_by: auth.tenantPersonId })
      .eq("id", settingsId);

    if (error) return { error: `Failed to clear image: ${error.message}` };

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_settings",
      record_id: settingsId,
      old_values: { hero_image_url: "removed" },
      new_values: { hero_image_url: null },
    });

    revalidatePath(`/org/${orgSlug}/memberships/portal`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export async function createModule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!title) return { error: "Module title is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const moduleData = {
    title,
    description: (formData.get("description") as string)?.trim() || null,
    module_type: (formData.get("moduleType") as string) || "text",
    content_html: (formData.get("contentHtml") as string) || null,
    embed_url: (formData.get("embedUrl") as string)?.trim() || null,
    status: (formData.get("status") as string) || "draft",
    restricted_card_design_ids: parseIds(formData.get("restrictedCardDesignIds") as string),
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newModule, error } = await tenant
    .from("portal_modules")
    .insert(moduleData)
    .select("id")
    .single();

  if (error) return { error: `Failed to create module: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "portal_modules",
    record_id: newModule.id,
    new_values: moduleData,
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true, moduleId: newModule.id };
}

export async function updateModule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const moduleId = formData.get("moduleId") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!moduleId) return { error: "Missing module ID." };
  if (!title) return { error: "Module title is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("portal_modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  if (!existing) return { error: "Module not found." };

  const updates = {
    title,
    description: (formData.get("description") as string)?.trim() || null,
    content_html: (formData.get("contentHtml") as string) || null,
    embed_url: (formData.get("embedUrl") as string)?.trim() || null,
    status: (formData.get("status") as string) || "draft",
    restricted_card_design_ids: parseIds(formData.get("restrictedCardDesignIds") as string),
    updated_by: auth.tenantPersonId,
  };

  const { error } = await tenant
    .from("portal_modules")
    .update(updates)
    .eq("id", moduleId);

  if (error) return { error: `Failed to update module: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "portal_modules",
    record_id: moduleId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  revalidatePath(`/org/${orgSlug}/memberships/portal/modules/${moduleId}`);
  return { success: true, moduleId };
}

export async function archiveModule(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const moduleId = formData.get("moduleId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!moduleId) return { error: "Missing module ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("portal_modules")
    .select("status")
    .eq("id", moduleId)
    .single();

  if (!existing) return { error: "Module not found." };

  const { error } = await tenant
    .from("portal_modules")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", moduleId);

  if (error) return { error: `Failed to archive module: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "delete" as const,
    table_name: "portal_modules",
    record_id: moduleId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

export async function uploadModuleFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const moduleId = formData.get("moduleId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!moduleId) return { error: "Missing module ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadModuleFile(org.id, moduleId, file);

    const tenant = getTenantClient(org);
    const { error } = await tenant
      .from("portal_modules")
      .update({
        file_url: publicUrl,
        file_name: file.name,
        file_size_bytes: file.size,
        updated_by: auth.tenantPersonId,
      })
      .eq("id", moduleId);

    if (error) return { error: `Failed to save file URL: ${error.message}` };

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_modules",
      record_id: moduleId,
      new_values: { file_url: publicUrl, file_name: file.name },
    });

    revalidatePath(`/org/${orgSlug}/memberships/portal/modules/${moduleId}`);
    return { success: true, fileUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeModuleFileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const moduleId = formData.get("moduleId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!moduleId) return { error: "Missing module ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteModuleFile(org.id, moduleId);

    const tenant = getTenantClient(org);
    const { error } = await tenant
      .from("portal_modules")
      .update({
        file_url: null,
        file_name: null,
        file_size_bytes: null,
        updated_by: auth.tenantPersonId,
      })
      .eq("id", moduleId);

    if (error) return { error: `Failed to clear file: ${error.message}` };

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_modules",
      record_id: moduleId,
      old_values: { file_url: "removed" },
      new_values: { file_url: null },
    });

    revalidatePath(`/org/${orgSlug}/memberships/portal/modules/${moduleId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function uploadModuleThumbnailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const moduleId = formData.get("moduleId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!moduleId) return { error: "Missing module ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadModuleThumbnail(org.id, moduleId, file);

    const tenant = getTenantClient(org);
    const { error } = await tenant
      .from("portal_modules")
      .update({ thumbnail_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", moduleId);

    if (error) return { error: `Failed to save thumbnail: ${error.message}` };

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_modules",
      record_id: moduleId,
      new_values: { thumbnail_url: publicUrl },
    });

    revalidatePath(`/org/${orgSlug}/memberships/portal/modules/${moduleId}`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeModuleThumbnailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const moduleId = formData.get("moduleId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!moduleId) return { error: "Missing module ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteModuleThumbnail(org.id, moduleId);

    const tenant = getTenantClient(org);
    const { error } = await tenant
      .from("portal_modules")
      .update({ thumbnail_url: null, updated_by: auth.tenantPersonId })
      .eq("id", moduleId);

    if (error) return { error: `Failed to clear thumbnail: ${error.message}` };

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "portal_modules",
      record_id: moduleId,
      old_values: { thumbnail_url: "removed" },
      new_values: { thumbnail_url: null },
    });

    revalidatePath(`/org/${orgSlug}/memberships/portal/modules/${moduleId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export async function createAnnouncement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!title) return { error: "Title is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const announcementData = {
    title,
    content_html: (formData.get("contentHtml") as string) || "",
    status: (formData.get("status") as string) || "draft",
    starts_at: (formData.get("startsAt") as string) || null,
    ends_at: (formData.get("endsAt") as string) || null,
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newAnnouncement, error } = await tenant
    .from("portal_announcements")
    .insert(announcementData)
    .select("id")
    .single();

  if (error) return { error: `Failed to create: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "portal_announcements",
    record_id: newAnnouncement.id,
    new_values: announcementData,
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

export async function updateAnnouncement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const announcementId = formData.get("announcementId") as string;
  const title = (formData.get("title") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!announcementId) return { error: "Missing announcement ID." };
  if (!title) return { error: "Title is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("portal_announcements")
    .select("*")
    .eq("id", announcementId)
    .single();

  if (!existing) return { error: "Announcement not found." };

  const updates = {
    title,
    content_html: (formData.get("contentHtml") as string) || "",
    status: (formData.get("status") as string) || "draft",
    starts_at: (formData.get("startsAt") as string) || null,
    ends_at: (formData.get("endsAt") as string) || null,
    updated_by: auth.tenantPersonId,
  };

  const { error } = await tenant
    .from("portal_announcements")
    .update(updates)
    .eq("id", announcementId);

  if (error) return { error: `Failed to update: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "portal_announcements",
    record_id: announcementId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

export async function archiveAnnouncement(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const announcementId = formData.get("announcementId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!announcementId) return { error: "Missing announcement ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("portal_announcements")
    .select("status")
    .eq("id", announcementId)
    .single();

  if (!existing) return { error: "Announcement not found." };

  const { error } = await tenant
    .from("portal_announcements")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", announcementId);

  if (error) return { error: `Failed to archive: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "delete" as const,
    table_name: "portal_announcements",
    record_id: announcementId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function answerQuestion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const questionId = formData.get("questionId") as string;
  const answerHtml = formData.get("answerHtml") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!questionId) return { error: "Missing question ID." };
  if (!answerHtml?.trim()) return { error: "Answer is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("portal_questions")
    .select("*")
    .eq("id", questionId)
    .single();

  if (!existing) return { error: "Question not found." };

  const updates = {
    answer_html: answerHtml,
    answered_by: auth.tenantPersonId,
    answered_at: new Date().toISOString(),
    status: "answered" as const,
    updated_by: auth.tenantPersonId,
  };

  const { error } = await tenant
    .from("portal_questions")
    .update(updates)
    .eq("id", questionId);

  if (error) return { error: `Failed to answer: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "portal_questions",
    record_id: questionId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

export async function archiveQuestion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const questionId = formData.get("questionId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!questionId) return { error: "Missing question ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("portal_questions")
    .select("status")
    .eq("id", questionId)
    .single();

  if (!existing) return { error: "Question not found." };

  const { error } = await tenant
    .from("portal_questions")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", questionId);

  if (error) return { error: `Failed to archive: ${error.message}` };

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "delete" as const,
    table_name: "portal_questions",
    record_id: questionId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/memberships/portal`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
