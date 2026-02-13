"use server";

import { revalidatePath } from "next/cache";
import {
  getOrgBySlug,
  getTenantClient,
  uploadEventBannerImage,
  deleteEventBannerImage,
  uploadEventSquareImage,
  deleteEventSquareImage,
} from "@sgscore/api";
import type { EventType, RecurrenceFrequency } from "@sgscore/types/tenant";
import { requireEventManage } from "@/lib/auth-guards";

interface ActionState {
  error?: string;
  success?: boolean;
  eventId?: string;
  imageUrl?: string;
}

const VALID_EVENT_TYPES: EventType[] = ["single", "multi_day", "recurring"];
const VALID_FREQUENCIES: RecurrenceFrequency[] = ["daily", "weekly", "biweekly", "monthly"];

// ---------------------------------------------------------------------------
// Schedule Generation
// ---------------------------------------------------------------------------

interface ScheduleRow {
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
}

function generateSchedules(
  eventType: EventType,
  form: {
    date?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    isAllDay?: boolean;
    frequency?: RecurrenceFrequency;
    daysOfWeek?: number[];
    recurrenceEndDate?: string;
    occurrenceCount?: number;
  },
): ScheduleRow[] {
  const startTime = form.isAllDay ? null : (form.startTime || null);
  const endTime = form.isAllDay ? null : (form.endTime || null);
  const isAllDay = form.isAllDay ?? false;

  if (eventType === "single") {
    if (!form.date) return [];
    return [{ date: form.date, start_time: startTime, end_time: endTime, is_all_day: isAllDay }];
  }

  if (eventType === "multi_day") {
    if (!form.startDate || !form.endDate) return [];
    const rows: ScheduleRow[] = [];
    const start = new Date(form.startDate + "T00:00:00");
    const end = new Date(form.endDate + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      rows.push({
        date: d.toISOString().split("T")[0],
        start_time: startTime,
        end_time: endTime,
        is_all_day: isAllDay,
      });
    }
    return rows;
  }

  if (eventType === "recurring") {
    if (!form.startDate || !form.frequency) return [];
    const rows: ScheduleRow[] = [];
    const start = new Date(form.startDate + "T00:00:00");
    const maxOccurrences = form.occurrenceCount ?? 365;
    const endDate = form.recurrenceEndDate
      ? new Date(form.recurrenceEndDate + "T00:00:00")
      : null;
    const daysOfWeek = form.daysOfWeek ?? [];

    let current = new Date(start);
    let count = 0;

    while (count < maxOccurrences && count < 365) {
      if (endDate && current > endDate) break;

      let shouldInclude = true;
      if (
        (form.frequency === "weekly" || form.frequency === "biweekly") &&
        daysOfWeek.length > 0
      ) {
        shouldInclude = daysOfWeek.includes(current.getDay());
      }

      if (shouldInclude) {
        rows.push({
          date: current.toISOString().split("T")[0],
          start_time: startTime,
          end_time: endTime,
          is_all_day: isAllDay,
        });
        count++;
      }

      // Advance date
      if (form.frequency === "daily") {
        current.setDate(current.getDate() + 1);
      } else if (form.frequency === "weekly") {
        current.setDate(current.getDate() + 1);
      } else if (form.frequency === "biweekly") {
        // For biweekly with days_of_week, advance day by day but count full weeks
        current.setDate(current.getDate() + 1);
      } else if (form.frequency === "monthly") {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return rows;
  }

  return [];
}

// ---------------------------------------------------------------------------
// Create Event
// ---------------------------------------------------------------------------

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Event name is required." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const eventType = formData.get("eventType") as string;
  if (!VALID_EVENT_TYPES.includes(eventType as EventType)) {
    return { error: "Invalid event type." };
  }

  const slug = (formData.get("slug") as string)?.trim();
  if (!slug) return { error: "Slug is required." };
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length < 2) {
    return { error: "Invalid slug format." };
  }

  const isFree = formData.get("isFree") === "true";
  const capacityStr = formData.get("capacity") as string;

  const eventData = {
    name,
    slug,
    description: (formData.get("description") as string)?.trim() || null,
    event_type: eventType,
    location_id: (formData.get("locationId") as string) || null,
    capacity: capacityStr ? parseInt(capacityStr, 10) || null : null,
    is_free: isFree,
    registration_required: formData.get("registrationRequired") !== "false",
    enable_check_in: formData.get("enableCheckIn") !== "false",
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
      confirmation: true,
      reminder_1day: true,
      reminder_1hour: true,
      followup: true,
    }),
    status: "draft",
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newEvent, error: insertError } = await tenant
    .from("events")
    .insert(eventData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create event: ${insertError.message}` };
  }

  // Generate schedules
  const scheduleForm = {
    date: formData.get("date") as string,
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    isAllDay: formData.get("isAllDay") === "true",
    frequency: formData.get("frequency") as RecurrenceFrequency,
    daysOfWeek: parseJson<number[]>(formData.get("daysOfWeek") as string, []),
    recurrenceEndDate: formData.get("recurrenceEndDate") as string,
    occurrenceCount: formData.get("occurrenceCount")
      ? parseInt(formData.get("occurrenceCount") as string, 10)
      : undefined,
  };

  const schedules = generateSchedules(eventType as EventType, scheduleForm);

  if (schedules.length > 0) {
    const scheduleRows = schedules.map((s) => ({
      event_id: newEvent.id,
      ...s,
    }));

    const { error: schedError } = await tenant
      .from("event_schedules")
      .insert(scheduleRows);

    if (schedError) {
      return { error: `Event created but schedules failed: ${schedError.message}` };
    }
  }

  // Insert recurrence rule for recurring events
  if (eventType === "recurring" && scheduleForm.frequency) {
    const ruleData = {
      event_id: newEvent.id,
      frequency: scheduleForm.frequency,
      days_of_week: scheduleForm.daysOfWeek ?? [],
      start_time: scheduleForm.startTime || null,
      end_time: scheduleForm.endTime || null,
      start_date: scheduleForm.startDate,
      end_date: scheduleForm.recurrenceEndDate || null,
      occurrence_count: scheduleForm.occurrenceCount ?? null,
    };

    await tenant.from("event_recurrence_rules").insert(ruleData);
  }

  // Insert price types
  if (!isFree) {
    const priceTypesRaw = formData.get("priceTypes") as string;
    if (priceTypesRaw) {
      const priceTypes = parseJson<PriceTypeInput[]>(priceTypesRaw, []);
      if (priceTypes.length > 0) {
        const rows = priceTypes.map((pt, i) => ({
          event_id: newEvent.id,
          name: pt.name?.trim() || `Tier ${i + 1}`,
          price_cents: pt.price_cents ?? 0,
          tax_rate: pt.tax_rate ?? 0,
          capacity: pt.capacity ?? null,
          sort_order: i,
        }));

        const { error: priceError } = await tenant
          .from("event_price_types")
          .insert(rows);

        if (priceError) {
          return { error: `Event created but price types failed: ${priceError.message}` };
        }
      }
    }
  }

  // Upload images if provided with create
  const bannerFile = formData.get("bannerFile") as File | null;
  const squareFile = formData.get("squareFile") as File | null;
  const imageUpdates: Record<string, string> = {};

  if (bannerFile && bannerFile.size > 0) {
    try {
      const url = await uploadEventBannerImage(org.id, newEvent.id, bannerFile);
      imageUpdates.banner_image_url = url;
    } catch {
      // non-fatal
    }
  }

  if (squareFile && squareFile.size > 0) {
    try {
      const url = await uploadEventSquareImage(org.id, newEvent.id, squareFile);
      imageUpdates.square_image_url = url;
    } catch {
      // non-fatal
    }
  }

  if (Object.keys(imageUpdates).length > 0) {
    await tenant
      .from("events")
      .update({ ...imageUpdates, updated_by: auth.tenantPersonId })
      .eq("id", newEvent.id);
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "events",
    record_id: newEvent.id,
    new_values: { ...eventData, ...imageUpdates },
  });

  revalidatePath(`/org/${orgSlug}/events/list`);
  return { success: true, eventId: newEvent.id };
}

// ---------------------------------------------------------------------------
// Update Event
// ---------------------------------------------------------------------------

export async function updateEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };
  if (!name) return { error: "Event name is required." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const eventType = formData.get("eventType") as string;
  if (!VALID_EVENT_TYPES.includes(eventType as EventType)) {
    return { error: "Invalid event type." };
  }

  const slug = (formData.get("slug") as string)?.trim();
  if (!slug) return { error: "Slug is required." };

  const { data: existing } = await tenant
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Event not found." };

  const isFree = formData.get("isFree") === "true";
  const capacityStr = formData.get("capacity") as string;

  const updates = {
    name,
    slug,
    description: (formData.get("description") as string)?.trim() || null,
    event_type: eventType,
    location_id: (formData.get("locationId") as string) || null,
    capacity: capacityStr ? parseInt(capacityStr, 10) || null : null,
    is_free: isFree,
    registration_required: formData.get("registrationRequired") !== "false",
    enable_check_in: formData.get("enableCheckIn") !== "false",
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
      confirmation: true,
      reminder_1day: true,
      reminder_1hour: true,
      followup: true,
    }),
    updated_by: auth.tenantPersonId,
  };

  const { error: updateError } = await tenant
    .from("events")
    .update(updates)
    .eq("id", eventId);

  if (updateError) {
    return { error: `Failed to update event: ${updateError.message}` };
  }

  // Delete and recreate schedules
  await tenant.from("event_schedules").delete().eq("event_id", eventId);
  await tenant.from("event_recurrence_rules").delete().eq("event_id", eventId);

  const scheduleForm = {
    date: formData.get("date") as string,
    startDate: formData.get("startDate") as string,
    endDate: formData.get("endDate") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    isAllDay: formData.get("isAllDay") === "true",
    frequency: formData.get("frequency") as RecurrenceFrequency,
    daysOfWeek: parseJson<number[]>(formData.get("daysOfWeek") as string, []),
    recurrenceEndDate: formData.get("recurrenceEndDate") as string,
    occurrenceCount: formData.get("occurrenceCount")
      ? parseInt(formData.get("occurrenceCount") as string, 10)
      : undefined,
  };

  const schedules = generateSchedules(eventType as EventType, scheduleForm);

  if (schedules.length > 0) {
    const scheduleRows = schedules.map((s) => ({
      event_id: eventId,
      ...s,
    }));

    await tenant.from("event_schedules").insert(scheduleRows);
  }

  if (eventType === "recurring" && scheduleForm.frequency) {
    await tenant.from("event_recurrence_rules").insert({
      event_id: eventId,
      frequency: scheduleForm.frequency,
      days_of_week: scheduleForm.daysOfWeek ?? [],
      start_time: scheduleForm.startTime || null,
      end_time: scheduleForm.endTime || null,
      start_date: scheduleForm.startDate,
      end_date: scheduleForm.recurrenceEndDate || null,
      occurrence_count: scheduleForm.occurrenceCount ?? null,
    });
  }

  // Delete and recreate price types
  await tenant.from("event_price_types").delete().eq("event_id", eventId);

  if (!isFree) {
    const priceTypesRaw = formData.get("priceTypes") as string;
    if (priceTypesRaw) {
      const priceTypes = parseJson<PriceTypeInput[]>(priceTypesRaw, []);
      if (priceTypes.length > 0) {
        const rows = priceTypes.map((pt, i) => ({
          event_id: eventId,
          name: pt.name?.trim() || `Tier ${i + 1}`,
          price_cents: pt.price_cents ?? 0,
          tax_rate: pt.tax_rate ?? 0,
          capacity: pt.capacity ?? null,
          sort_order: i,
        }));

        await tenant.from("event_price_types").insert(rows);
      }
    }
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "events",
    record_id: eventId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/events/list`);
  revalidatePath(`/org/${orgSlug}/events/list/${eventId}`);
  return { success: true, eventId };
}

// ---------------------------------------------------------------------------
// Publish / Unpublish
// ---------------------------------------------------------------------------

export async function publishEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Event not found." };

  const newStatus = existing.status === "active" ? "draft" : "active";

  const { error: updateError } = await tenant
    .from("events")
    .update({ status: newStatus, updated_by: auth.tenantPersonId })
    .eq("id", eventId);

  if (updateError) {
    return { error: `Failed to update status: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "events",
    record_id: eventId,
    old_values: { status: existing.status },
    new_values: { status: newStatus },
  });

  revalidatePath(`/org/${orgSlug}/events/list`);
  revalidatePath(`/org/${orgSlug}/events/list/${eventId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

export async function archiveEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Event not found." };

  const { error: updateError } = await tenant
    .from("events")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", eventId);

  if (updateError) {
    return { error: `Failed to archive event: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "events",
    record_id: eventId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/events/list`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!existing) return { error: "Event not found." };

  if (existing.status === "draft") {
    const { error: deleteError } = await tenant
      .from("events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      return { error: `Failed to delete event: ${deleteError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "delete" as const,
      table_name: "events",
      record_id: eventId,
      old_values: existing,
    });
  } else {
    const { error: updateError } = await tenant
      .from("events")
      .update({ status: "archived", updated_by: auth.tenantPersonId })
      .eq("id", eventId);

    if (updateError) {
      return { error: `Failed to archive event: ${updateError.message}` };
    }

    await tenant.from("audit_log").insert({
      actor_person_id: auth.tenantPersonId,
      actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
      action: "update" as const,
      table_name: "events",
      record_id: eventId,
      old_values: { status: existing.status },
      new_values: { status: "archived" },
    });
  }

  revalidatePath(`/org/${orgSlug}/events/list`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Duplicate
// ---------------------------------------------------------------------------

export async function duplicateEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: source } = await tenant
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!source) return { error: "Source event not found." };

  const copyData = {
    name: `${source.name} (Copy)`,
    slug: `${source.slug}-copy-${Date.now().toString(36)}`,
    description: source.description,
    event_type: source.event_type,
    location_id: source.location_id,
    capacity: source.capacity,
    is_free: source.is_free,
    registration_required: source.registration_required,
    enable_check_in: source.enable_check_in,
    selling_channels: source.selling_channels,
    delivery_formats: source.delivery_formats,
    email_settings: source.email_settings,
    status: "draft",
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newEvent, error: insertError } = await tenant
    .from("events")
    .insert(copyData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to duplicate event: ${insertError.message}` };
  }

  // Copy schedules
  const { data: sourceSchedules } = await tenant
    .from("event_schedules")
    .select("*")
    .eq("event_id", eventId)
    .order("date");

  if (sourceSchedules && sourceSchedules.length > 0) {
    const rows = sourceSchedules.map((s) => ({
      event_id: newEvent.id,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      is_all_day: s.is_all_day,
      is_cancelled: false,
      capacity_override: s.capacity_override,
    }));

    await tenant.from("event_schedules").insert(rows);
  }

  // Copy recurrence rules
  const { data: sourceRules } = await tenant
    .from("event_recurrence_rules")
    .select("*")
    .eq("event_id", eventId);

  if (sourceRules && sourceRules.length > 0) {
    const ruleRows = sourceRules.map((r) => ({
      event_id: newEvent.id,
      frequency: r.frequency,
      days_of_week: r.days_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      start_date: r.start_date,
      end_date: r.end_date,
      occurrence_count: r.occurrence_count,
    }));

    await tenant.from("event_recurrence_rules").insert(ruleRows);
  }

  // Copy price types
  const { data: sourcePrices } = await tenant
    .from("event_price_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (sourcePrices && sourcePrices.length > 0) {
    const priceRows = sourcePrices.map((pt) => ({
      event_id: newEvent.id,
      name: pt.name,
      price_cents: pt.price_cents,
      tax_rate: pt.tax_rate,
      capacity: pt.capacity,
      sort_order: pt.sort_order,
    }));

    await tenant.from("event_price_types").insert(priceRows);
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "events",
    record_id: newEvent.id,
    new_values: { ...copyData, duplicated_from: eventId },
  });

  revalidatePath(`/org/${orgSlug}/events/list`);
  return { success: true, eventId: newEvent.id };
}

// ---------------------------------------------------------------------------
// Image Upload/Remove
// ---------------------------------------------------------------------------

export async function uploadEventBanner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadEventBannerImage(org.id, eventId, file);

    const tenant = getTenantClient(org);
    await tenant
      .from("events")
      .update({ banner_image_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", eventId);

    revalidatePath(`/org/${orgSlug}/events/list/${eventId}`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeEventBanner(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteEventBannerImage(org.id, eventId);

    const tenant = getTenantClient(org);
    await tenant
      .from("events")
      .update({ banner_image_url: null, updated_by: auth.tenantPersonId })
      .eq("id", eventId);

    revalidatePath(`/org/${orgSlug}/events/list/${eventId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function uploadEventSquare(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;
  const file = formData.get("file") as File | null;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    const publicUrl = await uploadEventSquareImage(org.id, eventId, file);

    const tenant = getTenantClient(org);
    await tenant
      .from("events")
      .update({ square_image_url: publicUrl, updated_by: auth.tenantPersonId })
      .eq("id", eventId);

    revalidatePath(`/org/${orgSlug}/events/list/${eventId}`);
    return { success: true, imageUrl: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function removeEventSquare(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const eventId = formData.get("eventId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!eventId) return { error: "Missing event ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  try {
    await deleteEventSquareImage(org.id, eventId);

    const tenant = getTenantClient(org);
    await tenant
      .from("events")
      .update({ square_image_url: null, updated_by: auth.tenantPersonId })
      .eq("id", eventId);

    revalidatePath(`/org/${orgSlug}/events/list/${eventId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

export async function checkInPerson(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const registrationId = formData.get("registrationId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!registrationId) return { error: "Missing registration ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: registration } = await tenant
    .from("event_registrations")
    .select("*, events(name), event_schedules(date)")
    .eq("id", registrationId)
    .single();

  if (!registration) return { error: "Registration not found." };

  const { error: updateError } = await tenant
    .from("event_registrations")
    .update({
      checked_in_at: new Date().toISOString(),
      checked_in_by: auth.tenantPersonId,
    })
    .eq("id", registrationId);

  if (updateError) {
    return { error: `Check-in failed: ${updateError.message}` };
  }

  // Create visit record
  const eventName = (registration as Record<string, unknown>).events
    ? ((registration as Record<string, unknown>).events as { name: string }).name
    : "Event";
  const scheduleDate = (registration as Record<string, unknown>).event_schedules
    ? ((registration as Record<string, unknown>).event_schedules as { date: string }).date
    : "";

  await tenant.from("visits").insert({
    person_id: registration.person_id,
    visit_type: "event",
    notes: `Checked in to: ${eventName} on ${scheduleDate}`,
  });

  revalidatePath(`/org/${orgSlug}/events/registrations`);
  return { success: true };
}

export async function undoCheckIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const registrationId = formData.get("registrationId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!registrationId) return { error: "Missing registration ID." };

  const auth = await requireEventManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { error: updateError } = await tenant
    .from("event_registrations")
    .update({
      checked_in_at: null,
      checked_in_by: null,
    })
    .eq("id", registrationId);

  if (updateError) {
    return { error: `Undo check-in failed: ${updateError.message}` };
  }

  revalidatePath(`/org/${orgSlug}/events/registrations`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PriceTypeInput {
  name?: string;
  price_cents?: number | null;
  tax_rate?: number;
  capacity?: number | null;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
