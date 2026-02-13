"use client";

import { EventCard } from "./event-card";

interface EventRow {
  id: string;
  name: string;
  slug: string;
  banner_image_url: string | null;
  is_free: boolean;
  event_type: string;
  location_name?: string | null;
  next_date?: string | null;
  min_price_cents?: number | null;
}

interface EventsClientProps {
  orgSlug: string;
  events: EventRow[];
}

export function EventsClient({ orgSlug, events }: EventsClientProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} orgSlug={orgSlug} event={event} />
      ))}
    </div>
  );
}
