"use server";

import { revalidatePath } from "next/cache";
import {
  getOrgBySlug,
  getTenantClient,
  uploadTicketBannerImage,
  deleteTicketBannerImage,
  uploadTicketSquareImage,
  deleteTicketSquareImage,
} from "@sgscore/api";
import type { PricingMode, TicketMode, PurchaseWindow } from "@sgscore/types/tenant";
import { requireTicketManage } from "@/lib/auth-guards";

interface ActionState {
  error?: string;
  success?: boolean;
  ticketId?: string;
  imageUrl?: string;
}

const VALID_TICKET_MODES: TicketMode[] = ["timed_entry", "daily_admission"];
const VALID_PRICING_MODES: PricingMode[] = ["flat", "semi_dynamic", "full_dynamic"];
const VALID_PURCHASE_WINDOWS: PurchaseWindow[] = ["2_weeks", "30_days", "60_days", "90_days", "none"];

export async function createTicketType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Ticket name is required." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const ticketMode = formData.get("ticketMode") as string;
  if (!VALID_TICKET_MODES.includes(ticketMode as TicketMode)) {
    return { error: "Invalid ticket mode." };
  }

  const pricingMode = formData.get("pricingMode") as string;
  if (!VALID_PRICING_MODES.includes(pricingMode as PricingMode)) {
    return { error: "Invalid pricing mode." };
  }

  const purchaseWindow = formData.get("purchaseWindow") as string;
  if (!VALID_PURCHASE_WINDOWS.includes(purchaseWindow as PurchaseWindow)) {
    return { error: "Invalid purchase window." };
  }

  const guestAllowance = parseInt(formData.get("guestAllowance") as string, 10);
  if (isNaN(guestAllowance) || guestAllowance <= 0) {
    return { error: "Guest allowance must be a positive number." };
  }

  const timedIntervalMinutes = formData.get("timedIntervalMinutes") as string;
  const entryWindowMinutes = formData.get("entryWindowMinutes") as string;

  if (ticketMode === "timed_entry") {
    const interval = parseInt(timedIntervalMinutes, 10);
    const entry = parseInt(entryWindowMinutes, 10);
    if (isNaN(interval) || interval <= 0) {
      return { error: "Timed entry tickets require an interval." };
    }
    if (isNaN(entry) || entry <= 0) {
      return { error: "Timed entry tickets require an entry window." };
    }
  }

  const ticketData = {
    name,
    description: (formData.get("description") as string)?.trim() || null,
    ticket_mode: ticketMode,
    location_id: (formData.get("locationId") as string) || null,
    tags: parseTags(formData.get("tags") as string),
    include_terms: formData.get("includeTerms") === "true",
    pricing_mode: pricingMode,
    guest_allowance: guestAllowance,
    purchase_window: purchaseWindow,
    timed_interval_minutes: ticketMode === "timed_entry" ? parseInt(timedIntervalMinutes, 10) : null,
    entry_window_minutes: ticketMode === "timed_entry" ? parseInt(entryWindowMinutes, 10) : null,
    selling_channels: parseJson(formData.get("sellingChannels") as string, {
      in_person_counter: false,
      in_person_kiosk: false,
      online: false,
    }),
    delivery_formats: parseJson(formData.get("deliveryFormats") as string, {
      email: false,
      google_wallet: false,
      apple_wallet: false,
    }),
    email_settings: parseJson(formData.get("emailSettings") as string, {
      post_purchase: true,
      reminder_1day: true,
      reminder_1hour: true,
      day_after: true,
    }),
    status: "draft",
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newTicket, error: insertError } = await tenant
    .from("ticket_types")
    .insert(ticketData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create ticket: ${insertError.message}` };
  }

  // Insert price types
  const priceTypesRaw = formData.get("priceTypes") as string;
  if (priceTypesRaw) {
    const priceTypes = parseJson<PriceTypeInput[]>(priceTypesRaw, []);
    if (priceTypes.length > 0) {
      const rows = priceTypes.map((pt, i) => ({
        ticket_type_id: newTicket.id,
        name: pt.name?.trim() || `Tier ${i + 1}`,
        price_cents: pt.price_cents ?? null,
        day_prices: pt.day_prices ?? null,
        target_price_cents: pt.target_price_cents ?? null,
        tax_rate: pt.tax_rate ?? 0,
        sort_order: i,
      }));

      const { error: priceError } = await tenant
        .from("ticket_price_types")
        .insert(rows);

      if (priceError) {
        return { error: `Ticket created but price types failed: ${priceError.message}` };
      }
    }
  }

  // Insert blocked dates if provided
  const blockedDatesRaw = formData.get("newBlockedDates") as string;
  if (blockedDatesRaw) {
    const newDates = parseJson<BlockedDateInput[]>(blockedDatesRaw, []);
    if (newDates.length > 0) {
      const rows = newDates.map((d) => ({
        location_id: (formData.get("locationId") as string) || null,
        start_date: d.start_date,
        end_date: d.end_date,
        reason: d.reason?.trim() || "Blocked",
      }));

      await tenant.from("blocked_dates").insert(rows);
    }
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "ticket_types",
    record_id: newTicket.id,
    new_values: ticketData,
  });

  revalidatePath(`/org/${orgSlug}/tickets/list`);
  return { success: true, ticketId: newTicket.id };
}

export async function updateTicketType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };
  if (!name) return { error: "Ticket name is required." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const ticketMode = formData.get("ticketMode") as string;
  if (!VALID_TICKET_MODES.includes(ticketMode as TicketMode)) {
    return { error: "Invalid ticket mode." };
  }

  const pricingMode = formData.get("pricingMode") as string;
  if (!VALID_PRICING_MODES.includes(pricingMode as PricingMode)) {
    return { error: "Invalid pricing mode." };
  }

  const purchaseWindow = formData.get("purchaseWindow") as string;
  if (!VALID_PURCHASE_WINDOWS.includes(purchaseWindow as PurchaseWindow)) {
    return { error: "Invalid purchase window." };
  }

  const guestAllowance = parseInt(formData.get("guestAllowance") as string, 10);
  if (isNaN(guestAllowance) || guestAllowance <= 0) {
    return { error: "Guest allowance must be a positive number." };
  }

  const timedIntervalMinutes = formData.get("timedIntervalMinutes") as string;
  const entryWindowMinutes = formData.get("entryWindowMinutes") as string;

  if (ticketMode === "timed_entry") {
    const interval = parseInt(timedIntervalMinutes, 10);
    const entry = parseInt(entryWindowMinutes, 10);
    if (isNaN(interval) || interval <= 0) {
      return { error: "Timed entry tickets require an interval." };
    }
    if (isNaN(entry) || entry <= 0) {
      return { error: "Timed entry tickets require an entry window." };
    }
  }

  // Fetch existing for audit trail
  const { data: existing } = await tenant
    .from("ticket_types")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!existing) return { error: "Ticket not found." };

  const updates = {
    name,
    description: (formData.get("description") as string)?.trim() || null,
    ticket_mode: ticketMode,
    location_id: (formData.get("locationId") as string) || null,
    tags: parseTags(formData.get("tags") as string),
    include_terms: formData.get("includeTerms") === "true",
    pricing_mode: pricingMode,
    guest_allowance: guestAllowance,
    purchase_window: purchaseWindow,
    timed_interval_minutes: ticketMode === "timed_entry" ? parseInt(timedIntervalMinutes, 10) : null,
    entry_window_minutes: ticketMode === "timed_entry" ? parseInt(entryWindowMinutes, 10) : null,
    selling_channels: parseJson(formData.get("sellingChannels") as string, {
      in_person_counter: false,
      in_person_kiosk: false,
      online: false,
    }),
    delivery_formats: parseJson(formData.get("deliveryFormats") as string, {
      email: false,
      google_wallet: false,
      apple_wallet: false,
    }),
    email_settings: parseJson(formData.get("emailSettings") as string, {
      post_purchase: true,
      reminder_1day: true,
      reminder_1hour: true,
      day_after: true,
    }),
    updated_by: auth.tenantPersonId,
  };

  const { error: updateError } = await tenant
    .from("ticket_types")
    .update(updates)
    .eq("id", ticketId);

  if (updateError) {
    return { error: `Failed to update ticket: ${updateError.message}` };
  }

  // Upsert price types: delete existing, insert new
  const priceTypesRaw = formData.get("priceTypes") as string;
  if (priceTypesRaw) {
    await tenant.from("ticket_price_types").delete().eq("ticket_type_id", ticketId);

    const priceTypes = parseJson<PriceTypeInput[]>(priceTypesRaw, []);
    if (priceTypes.length > 0) {
      const rows = priceTypes.map((pt, i) => ({
        ticket_type_id: ticketId,
        name: pt.name?.trim() || `Tier ${i + 1}`,
        price_cents: pt.price_cents ?? null,
        day_prices: pt.day_prices ?? null,
        target_price_cents: pt.target_price_cents ?? null,
        tax_rate: pt.tax_rate ?? 0,
        sort_order: i,
      }));

      const { error: priceError } = await tenant
        .from("ticket_price_types")
        .insert(rows);

      if (priceError) {
        return { error: `Ticket updated but price types failed: ${priceError.message}` };
      }
    }
  }

  // Insert new blocked dates
  const blockedDatesRaw = formData.get("newBlockedDates") as string;
  if (blockedDatesRaw) {
    const newDates = parseJson<BlockedDateInput[]>(blockedDatesRaw, []);
    if (newDates.length > 0) {
      const rows = newDates.map((d) => ({
        location_id: (formData.get("locationId") as string) || null,
        start_date: d.start_date,
        end_date: d.end_date,
        reason: d.reason?.trim() || "Blocked",
      }));

      await tenant.from("blocked_dates").insert(rows);
    }
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "ticket_types",
    record_id: ticketId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/tickets/list`);
  revalidatePath(`/org/${orgSlug}/tickets/list/${ticketId}`);
  return { success: true, ticketId };
}

export async function archiveTicketType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("ticket_types")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!existing) return { error: "Ticket not found." };

  const { error: updateError } = await tenant
    .from("ticket_types")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", ticketId);

  if (updateError) {
    return { error: `Failed to archive ticket: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "ticket_types",
    record_id: ticketId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/tickets/list`);
  return { success: true };
}

export async function deleteTicketType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("ticket_types")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!existing) return { error: "Ticket not found." };

  // Only hard delete if draft; otherwise archive
  if (existing.status === "draft") {
    const { error: deleteError } = await tenant
      .from("ticket_types")
      .delete()
      .eq("id", ticketId);

    if (deleteError) {
      return { error: `Failed to delete ticket: ${deleteError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "delete" as const,
      table_name: "ticket_types",
      record_id: ticketId,
      old_values: existing,
    });
  } else {
    // Soft delete: archive
    const { error: updateError } = await tenant
      .from("ticket_types")
      .update({ status: "archived", updated_by: auth.tenantPersonId })
      .eq("id", ticketId);

    if (updateError) {
      return { error: `Failed to archive ticket: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "ticket_types",
      record_id: ticketId,
      old_values: { status: existing.status },
      new_values: { status: "archived" },
    });
  }

  revalidatePath(`/org/${orgSlug}/tickets/list`);
  return { success: true };
}

export async function duplicateTicketType(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: source } = await tenant
    .from("ticket_types")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!source) return { error: "Source ticket not found." };

  // Copy ticket with new name and draft status, without images
  const copyData = {
    name: `${source.name} (Copy)`,
    description: source.description,
    ticket_mode: source.ticket_mode,
    location_id: source.location_id,
    tags: source.tags,
    include_terms: source.include_terms,
    pricing_mode: source.pricing_mode,
    guest_allowance: source.guest_allowance,
    purchase_window: source.purchase_window,
    timed_interval_minutes: source.timed_interval_minutes,
    entry_window_minutes: source.entry_window_minutes,
    selling_channels: source.selling_channels,
    delivery_formats: source.delivery_formats,
    email_settings: source.email_settings,
    status: "draft",
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newTicket, error: insertError } = await tenant
    .from("ticket_types")
    .insert(copyData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to duplicate ticket: ${insertError.message}` };
  }

  // Copy price types
  const { data: sourcePrices } = await tenant
    .from("ticket_price_types")
    .select("*")
    .eq("ticket_type_id", ticketId)
    .order("sort_order");

  if (sourcePrices && sourcePrices.length > 0) {
    const rows = sourcePrices.map((pt) => ({
      ticket_type_id: newTicket.id,
      name: pt.name,
      price_cents: pt.price_cents,
      day_prices: pt.day_prices,
      target_price_cents: pt.target_price_cents,
      tax_rate: pt.tax_rate,
      sort_order: pt.sort_order,
    }));

    await tenant.from("ticket_price_types").insert(rows);
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "ticket_types",
    record_id: newTicket.id,
    new_values: { ...copyData, duplicated_from: ticketId },
  });

  revalidatePath(`/org/${orgSlug}/tickets/list`);
  return { success: true, ticketId: newTicket.id };
}

export async function uploadTicketBanner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadTicketBannerImage(org.id, ticketId, file);

    const tenant = getTenantClient(org);
    const { error: updateError } = await tenant
      .from("ticket_types")
      .update({ banner_image_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", ticketId);

    if (updateError) {
      return { error: `Failed to save image URL: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "ticket_types",
      record_id: ticketId,
      new_values: { banner_image_url: publicUrl },
    });

    revalidatePath(`/org/${orgSlug}/tickets/list/${ticketId}`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeTicketBanner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteTicketBannerImage(org.id, ticketId);

    const tenant = getTenantClient(org);
    const { error: updateError } = await tenant
      .from("ticket_types")
      .update({ banner_image_url: null, updated_by: auth.tenantPersonId })
      .eq("id", ticketId);

    if (updateError) {
      return { error: `Failed to clear image: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "ticket_types",
      record_id: ticketId,
      old_values: { banner_image_url: "removed" },
      new_values: { banner_image_url: null },
    });

    revalidatePath(`/org/${orgSlug}/tickets/list/${ticketId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function uploadTicketSquare(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadTicketSquareImage(org.id, ticketId, file);

    const tenant = getTenantClient(org);
    const { error: updateError } = await tenant
      .from("ticket_types")
      .update({ square_image_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", ticketId);

    if (updateError) {
      return { error: `Failed to save image URL: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "ticket_types",
      record_id: ticketId,
      new_values: { square_image_url: publicUrl },
    });

    revalidatePath(`/org/${orgSlug}/tickets/list/${ticketId}`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeTicketSquare(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const ticketId = formData.get("ticketId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!ticketId) return { error: "Missing ticket ID." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteTicketSquareImage(org.id, ticketId);

    const tenant = getTenantClient(org);
    const { error: updateError } = await tenant
      .from("ticket_types")
      .update({ square_image_url: null, updated_by: auth.tenantPersonId })
      .eq("id", ticketId);

    if (updateError) {
      return { error: `Failed to clear image: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "ticket_types",
      record_id: ticketId,
      old_values: { square_image_url: "removed" },
      new_values: { square_image_url: null },
    });

    revalidatePath(`/org/${orgSlug}/tickets/list/${ticketId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PriceTypeInput {
  name?: string;
  price_cents?: number | null;
  day_prices?: Record<string, number | null> | null;
  target_price_cents?: number | null;
  tax_rate?: number;
}

interface BlockedDateInput {
  start_date: string;
  end_date: string;
  reason?: string;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
