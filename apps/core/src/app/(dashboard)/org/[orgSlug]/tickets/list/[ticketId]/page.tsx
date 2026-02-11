import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect, notFound } from "next/navigation";
import type {
  TicketType,
  TicketPriceType,
  Location,
  BlockedDate,
} from "@sgscore/types/tenant";
import { TicketEditor } from "../ticket-editor";

export default async function EditTicketPage({
  params,
}: {
  params: Promise<{ orgSlug: string; ticketId: string }>;
}) {
  const { orgSlug, ticketId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: ticket } = await tenant
    .from("ticket_types")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (!ticket) notFound();

  const { data: priceData } = await tenant
    .from("ticket_price_types")
    .select("*")
    .eq("ticket_type_id", ticketId)
    .order("sort_order");

  const { data: locationData } = await tenant
    .from("locations")
    .select("*")
    .order("name");

  const { data: blockedData } = await tenant
    .from("blocked_dates")
    .select("*")
    .order("start_date");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Edit: {(ticket as TicketType).name}
      </h2>
      <TicketEditor
        orgSlug={orgSlug}
        locations={(locationData ?? []) as Location[]}
        blockedDates={(blockedData ?? []) as BlockedDate[]}
        ticket={ticket as TicketType}
        priceTypes={(priceData ?? []) as TicketPriceType[]}
      />
    </div>
  );
}
