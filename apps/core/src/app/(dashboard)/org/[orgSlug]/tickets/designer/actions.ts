"use server";

import { revalidatePath } from "next/cache";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import type {
  TicketDesignFieldKey,
  TicketDesignFieldConfig,
  TicketDesignOptionKey,
  TicketDesignOptions,
} from "@sgscore/types/tenant";
import { requireTicketManage } from "@/lib/auth-guards";

interface ActionState {
  error?: string;
  success?: boolean;
  designId?: string;
}

const FIELD_KEYS: TicketDesignFieldKey[] = [
  "guest_name",
  "date",
  "time",
  "barcode",
  "event_name",
  "location",
  "ticket_price",
  "ticket_number",
  "order_number",
  "registrant_name",
];

const OPTION_KEYS: TicketDesignOptionKey[] = [
  "mobile_pdf",
  "print_tickets",
  "download_tickets",
  "display_tickets_first",
  "qr_code",
];

function parseFieldConfig(formData: FormData): TicketDesignFieldConfig {
  const config = {} as TicketDesignFieldConfig;
  for (const key of FIELD_KEYS) {
    config[key] = formData.get(`field_${key}`) === "true";
  }
  return config;
}

function parseOptions(formData: FormData): TicketDesignOptions {
  const opts = {} as TicketDesignOptions;
  for (const key of OPTION_KEYS) {
    opts[key] = formData.get(`opt_${key}`) === "true";
  }
  return opts;
}

export async function createTicketDesign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!name) return { error: "Design name is required." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const designData = {
    name,
    field_config: parseFieldConfig(formData),
    options: parseOptions(formData),
    background_color: (formData.get("backgroundColor") as string) || "#FFF8E1",
    font_color: (formData.get("fontColor") as string) || "#000000",
    body_text: (formData.get("bodyText") as string) ?? "Your Tickets\n\nThank you for your purchase!",
    terms_text: (formData.get("termsText") as string) ?? "TERMS AND CONDITIONS NO REFUNDS. RESALE IS PROHIBITED.",
    is_default: formData.get("isDefault") === "true",
    created_by: auth.tenantPersonId,
    updated_by: auth.tenantPersonId,
  };

  const { data: newDesign, error: insertError } = await tenant
    .from("ticket_designs")
    .insert(designData)
    .select("id")
    .single();

  if (insertError) {
    return { error: `Failed to create design: ${insertError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "create" as const,
    table_name: "ticket_designs",
    record_id: newDesign.id,
    new_values: designData,
  });

  revalidatePath(`/org/${orgSlug}/tickets/designer`);
  return { success: true, designId: newDesign.id };
}

export async function updateTicketDesign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const designId = formData.get("designId") as string;
  const name = (formData.get("name") as string)?.trim();

  if (!orgSlug) return { error: "Missing org slug." };
  if (!designId) return { error: "Missing design ID." };
  if (!name) return { error: "Design name is required." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  // Fetch old values for audit trail
  const { data: existing } = await tenant
    .from("ticket_designs")
    .select("*")
    .eq("id", designId)
    .single();

  if (!existing) return { error: "Ticket design not found." };

  const updates = {
    name,
    field_config: parseFieldConfig(formData),
    options: parseOptions(formData),
    background_color: (formData.get("backgroundColor") as string) || "#FFF8E1",
    font_color: (formData.get("fontColor") as string) || "#000000",
    body_text: (formData.get("bodyText") as string) ?? "",
    terms_text: (formData.get("termsText") as string) ?? "",
    is_default: formData.get("isDefault") === "true",
    updated_by: auth.tenantPersonId,
  };

  const { error: updateError } = await tenant
    .from("ticket_designs")
    .update(updates)
    .eq("id", designId);

  if (updateError) {
    return { error: `Failed to update design: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "update" as const,
    table_name: "ticket_designs",
    record_id: designId,
    old_values: existing,
    new_values: updates,
  });

  revalidatePath(`/org/${orgSlug}/tickets/designer`);
  revalidatePath(`/org/${orgSlug}/tickets/designer/${designId}`);
  return { success: true, designId };
}

export async function deleteTicketDesign(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgSlug = formData.get("orgSlug") as string;
  const designId = formData.get("designId") as string;

  if (!orgSlug) return { error: "Missing org slug." };
  if (!designId) return { error: "Missing design ID." };

  const auth = await requireTicketManage(orgSlug);
  if ("error" in auth) return { error: auth.error };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const tenant = getTenantClient(org);

  const { data: existing } = await tenant
    .from("ticket_designs")
    .select("*")
    .eq("id", designId)
    .single();

  if (!existing) return { error: "Ticket design not found." };

  const { error: updateError } = await tenant
    .from("ticket_designs")
    .update({ status: "archived", updated_by: auth.tenantPersonId })
    .eq("id", designId);

  if (updateError) {
    return { error: `Failed to archive design: ${updateError.message}` };
  }

  await tenant.from("audit_log").insert({
    actor_person_id: auth.tenantPersonId,
    actor_type: auth.tenantPersonId ? "staff" : ("sgs_support" as const),
    action: "delete" as const,
    table_name: "ticket_designs",
    record_id: designId,
    old_values: { status: existing.status },
    new_values: { status: "archived" },
  });

  revalidatePath(`/org/${orgSlug}/tickets/designer`);
  return { success: true };
}
