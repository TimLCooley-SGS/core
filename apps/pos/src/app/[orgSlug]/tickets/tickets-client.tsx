"use client";

import type { TicketType, TicketPriceType } from "@sgscore/types/tenant";
import { TicketCard } from "./ticket-card";

interface TicketsClientProps {
  tickets: TicketType[];
  priceTypes: TicketPriceType[];
}

export function TicketsClient({ tickets, priceTypes }: TicketsClientProps) {
  const pricesByTicket = new Map<string, TicketPriceType[]>();
  for (const pt of priceTypes) {
    const list = pricesByTicket.get(pt.ticket_type_id) ?? [];
    list.push(pt);
    pricesByTicket.set(pt.ticket_type_id, list);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          priceTypes={pricesByTicket.get(ticket.id) ?? []}
        />
      ))}
    </div>
  );
}
