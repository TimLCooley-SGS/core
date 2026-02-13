"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
} from "@sgscore/ui";
import { MapPin } from "lucide-react";

interface EventCardProps {
  orgSlug: string;
  event: {
    id: string;
    name: string;
    slug: string;
    banner_image_url: string | null;
    is_free: boolean;
    event_type: string;
    location_name?: string | null;
    next_date?: string | null;
    min_price_cents?: number | null;
  };
}

const typeLabel: Record<string, string> = {
  single: "Single Day",
  multi_day: "Multi-Day",
  recurring: "Recurring",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
  };
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function EventCard({ orgSlug, event }: EventCardProps) {
  const dateParts = event.next_date ? formatDate(event.next_date) : null;

  return (
    <Link href={`/${orgSlug}/events/${event.slug}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        {event.banner_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.banner_image_url}
            alt=""
            className="w-full object-cover"
            style={{ aspectRatio: "16 / 9" }}
          />
        )}
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Date badge */}
            {dateParts && (
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-[10px] font-semibold leading-none">
                  {dateParts.month}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {dateParts.day}
                </span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm group-hover:underline line-clamp-2">
                {event.name}
              </h3>

              {event.location_name && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{event.location_name}</span>
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                {event.is_free ? "Free" : event.min_price_cents ? `From ${formatCents(event.min_price_cents)}` : ""}
                {event.is_free || event.min_price_cents ? " · " : ""}
                {typeLabel[event.event_type] ?? event.event_type}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
