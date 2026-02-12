import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { Card, CardContent } from "@sgscore/ui";
import { Ticket } from "lucide-react";
import type { TicketType, TicketPriceType } from "@sgscore/types/tenant";
import { TicketsClient } from "./tickets-client";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const tenant = getTenantClient(org);

  const { data: tickets } = await tenant
    .from("ticket_types")
    .select("*")
    .eq("status", "active")
    .order("name");

  const activeTickets = ((tickets ?? []) as TicketType[]).filter(
    (t) => t.selling_channels?.online,
  );

  if (activeTickets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Tickets</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Ticket className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No Tickets Available</p>
              <p className="text-sm text-muted-foreground">
                There are no tickets available for purchase right now. Please
                check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ticketIds = activeTickets.map((t) => t.id);
  const { data: priceTypes } = await tenant
    .from("ticket_price_types")
    .select("*")
    .in("ticket_type_id", ticketIds)
    .order("sort_order");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Tickets</h1>
      <TicketsClient
        tickets={activeTickets}
        priceTypes={(priceTypes ?? []) as TicketPriceType[]}
      />
    </div>
  );
}
