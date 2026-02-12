"use server";

import { revalidatePath } from "next/cache";
import {
  getOrgBySlug,
  getTenantClient,
  uploadCardImage,
  deleteCardImage,
} from "@sgscore/api";
import type { MembershipCardField } from "@sgscore/types/tenant";
import { requireMembershipManage } from "@/lib/auth-guards";

interface ActionState {
  error?: string;
  success?: boolean;
  cardId?: string;
  imageUrl?: string;
}

const ALL_FIELDS: MembershipCardField[] = [
  "program_name",
  "member_name",
  "membership_id",
  "status",
  "expiration_date",
  "start_date",
  "amount",
  "seat_count",
  "barcode",
  "member_since",
];

function parseFields(raw: string | null): MembershipCardField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.filter((f): f is MembershipCardField =>
      ALL_FIELDS.includes(f as MembershipCardField),
    ).slice(0, 4);
  } catch {
    return [];
  }
}

export async function createCardDesign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Card name is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const frontFields = parseFields(formData.get("frontFields") as string);
  const backFields = parseFields(formData.get("backFields") as string);

  const priceCents = parseInt(formData.get("priceCents") as string, 10);
  const posVisible = formData.get("posVisible") === "true";

  const cardData = {
    name,
    pdf_name: (formData.get("pdfName") as string)?.trim() || null,
    front_fields: frontFields,
    back_fields: backFields,
    font_color: (formData.get("fontColor") as string) || "#000000",
    accent_color: (formData.get("accentColor") as string) || "#4E2C70",
    background_color: (formData.get("backgroundColor") as string) || "#FFFFFF",
    default_side: (formData.get("defaultSide") as string) === "back" ? "back" : "front",
    is_default: formData.get("isDefault") === "true",
    card_options: {
      print: formData.get("opt_print") === "true",
      download_pdf: formData.get("opt_download_pdf") === "true",
      apple_wallet: formData.get("opt_apple_wallet") === "true",
      google_wallet: formData.get("opt_google_wallet") === "true",
      push_notifications: formData.get("opt_push_notifications") === "true",
    },
    restricted_plan_ids: parseRestrictedPlans(formData.get("restrictedPlanIds") as string),
    price_cents: isNaN(priceCents) ? 0 : priceCents,
    pos_visible: posVisible,
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newCard, error: insertError } = await tenant
    .from("membership_card_designs")
    .insert(cardData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create card: ${insertError.message}` };
  }

  // Upload front image if provided with create
  const frontImageFile = formData.get("frontImageFile") as File | null;
  let frontImageUrl: string | null = null;
  if (frontImageFile && frontImageFile.size > 0) {
    try {
      frontImageUrl = await uploadCardImage(org.id, newCard.id, frontImageFile);
      await tenant
        .from("membership_card_designs")
        .update({ front_image_url: frontImageUrl, updated_by: auth.tenantPersonId })
        .eq("id", newCard.id);
    } catch {
      // non-fatal
    }
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "membership_card_designs",
    record_id: newCard.id,
    new_values: { ...cardData, ...(frontImageUrl ? { front_image_url: frontImageUrl } : {}) },
  });

  revalidatePath(`/org/${orgSlug}/memberships/cards`);
  return { success: true, cardId: newCard.id };
}

export async function updateCardDesign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const cardId = formData.get("cardId") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!cardId) return { error: "Missing card ID." };
  if (!name) return { error: "Card name is required." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const frontFields = parseFields(formData.get("frontFields") as string);
  const backFields = parseFields(formData.get("backFields") as string);

  const priceCents = parseInt(formData.get("priceCents") as string, 10);
  const posVisible = formData.get("posVisible") === "true";

  const updates = {
    name,
    pdf_name: (formData.get("pdfName") as string)?.trim() || null,
    front_fields: frontFields,
    back_fields: backFields,
    font_color: (formData.get("fontColor") as string) || "#000000",
    accent_color: (formData.get("accentColor") as string) || "#4E2C70",
    background_color: (formData.get("backgroundColor") as string) || "#FFFFFF",
    default_side: (formData.get("defaultSide") as string) === "back" ? "back" : "front",
    is_default: formData.get("isDefault") === "true",
    card_options: {
      print: formData.get("opt_print") === "true",
      download_pdf: formData.get("opt_download_pdf") === "true",
      apple_wallet: formData.get("opt_apple_wallet") === "true",
      google_wallet: formData.get("opt_google_wallet") === "true",
      push_notifications: formData.get("opt_push_notifications") === "true",
    },
    restricted_plan_ids: parseRestrictedPlans(formData.get("restrictedPlanIds") as string),
    price_cents: isNaN(priceCents) ? 0 : priceCents,
    pos_visible: posVisible,
    updated_by: auth.tenantPersonId,
  };

  // Fetch old values for audit trail
  const { data: existing } = await tenant
    .from("membership_card_designs")
    .select("*")
    .eq("id", cardId)
    .single();

  if (!existing) return { error: "Card design not found." };

  const { error: updateError } = await tenant
    .from("membership_card_designs")
    .update(updates)
    .eq("id", cardId);

  if (updateError) {
    return { error: `Failed to update card: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "membership_card_designs",
    record_id: cardId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/memberships/cards`);
  revalidatePath(`/org/${orgSlug}/memberships/cards/${cardId}`);
  return { success: true, cardId };
}

export async function deleteCardDesign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const cardId = formData.get("cardId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!cardId) return { error: "Missing card ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  // Soft delete: set status to archived
  const { data: existing } = await tenant
    .from("membership_card_designs")
    .select("*")
    .eq("id", cardId)
    .single();

  if (!existing) return { error: "Card design not found." };

  const { error: updateError } = await tenant
    .from("membership_card_designs")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", cardId);

  if (updateError) {
    return { error: `Failed to archive card: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "delete" as const,
    table_name: "membership_card_designs",
    record_id: cardId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/memberships/cards`);
  return { success: true };
}

export async function uploadFrontImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const cardId = formData.get("cardId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!cardId) return { error: "Missing card ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadCardImage(org.id, cardId, file);

    const tenant = getTenantClient(org);
    const { error: updateError } = await tenant
      .from("membership_card_designs")
      .update({ front_image_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", cardId);

    if (updateError) {
      return { error: `Failed to save image URL: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "membership_card_designs",
      record_id: cardId,
      new_values: { front_image_url: publicUrl },
    });

    revalidatePath(`/org/${orgSlug}/memberships/cards/${cardId}`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeFrontImage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const cardId = formData.get("cardId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!cardId) return { error: "Missing card ID." };

  const auth = await requireMembershipManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteCardImage(org.id, cardId);

    const tenant = getTenantClient(org);
    const { error: updateError } = await tenant
      .from("membership_card_designs")
      .update({ front_image_url: null, updated_by: auth.tenantPersonId })
      .eq("id", cardId);

    if (updateError) {
      return { error: `Failed to clear image: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "membership_card_designs",
      record_id: cardId,
      old_values: { front_image_url: "removed" },
      new_values: { front_image_url: null },
    });

    revalidatePath(`/org/${orgSlug}/memberships/cards/${cardId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

function parseRestrictedPlans(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
