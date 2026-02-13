"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@sgscore/ui";
import { MapPin, Clock, Minus, Plus, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-provider";

interface EventDetailProps {
  orgSlug: string;
  orgName: string;
  event: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    event_type: string;
    banner_image_url: string | null;
    is_free: boolean;
    capacity: number | null;
    location_name: string | null;
  };
  schedules: {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_all_day: boolean;
    is_cancelled: boolean;
    capacity_override: number | null;
  }[];
  priceTypes: {
    id: string;
    name: string;
    price_cents: number;
    tax_rate: number;
    capacity: number | null;
    sort_order: number;
  }[];
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
    full: d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function EventDetail({
  orgSlug,
  orgName,
  event,
  schedules,
  priceTypes,
}: EventDetailProps) {
  const { addItem } = useCart();
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(
    () => {
      // Auto-select the first schedule for single-day events
      if (event.event_type === "single" && schedules.length === 1) {
        return new Set([schedules[0].id]);
      }
      return new Set();
    },
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [added, setAdded] = useState(false);

  const isMultiSchedule =
    event.event_type === "recurring" || event.event_type === "multi_day";
  const firstSchedule = schedules[0] ?? null;
  const firstDateParts = firstSchedule ? formatDate(firstSchedule.date) : null;

  function toggleSchedule(scheduleId: string) {
    setSelectedScheduleIds((prev) => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      return next;
    });
  }

  function setQty(priceTypeId: string, qty: number) {
    setQuantities((prev) => ({
      ...prev,
      [priceTypeId]: Math.max(0, qty),
    }));
  }

  const hasScheduleSelection = selectedScheduleIds.size > 0;
  const hasPriceSelection = Object.values(quantities).some((q) => q > 0);
  const canAddToCart = event.is_free
    ? hasScheduleSelection
    : hasScheduleSelection && hasPriceSelection;

  function handleAddToCart() {
    if (event.is_free) {
      // Free events: add one item per selected schedule
      for (const scheduleId of selectedScheduleIds) {
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (!schedule) continue;
        addItem({
          type: "event",
          id: `${event.id}-${scheduleId}-free`,
          name: `${event.name} — ${formatDate(schedule.date).full}`,
          priceCents: 0,
          quantity: 1,
          metadata: { eventId: event.id, scheduleId, date: schedule.date },
        });
      }
    } else {
      // Paid events: add one item per schedule × price type
      for (const scheduleId of selectedScheduleIds) {
        const schedule = schedules.find((s) => s.id === scheduleId);
        if (!schedule) continue;

        for (const pt of priceTypes) {
          const qty = quantities[pt.id] ?? 0;
          if (qty <= 0) continue;
          addItem({
            type: "event",
            id: `${event.id}-${scheduleId}-${pt.id}`,
            name: `${event.name} — ${pt.name} (${formatDate(schedule.date).full})`,
            priceCents: pt.price_cents,
            quantity: qty,
            metadata: {
              eventId: event.id,
              scheduleId,
              priceTypeId: pt.id,
              date: schedule.date,
            },
          });
        }
      }
    }

    setQuantities({});
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const minPriceCents =
    priceTypes.length > 0
      ? Math.min(...priceTypes.map((pt) => pt.price_cents))
      : null;

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      {event.banner_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.banner_image_url}
          alt=""
          className="w-full rounded-xl object-cover"
          style={{ aspectRatio: "16 / 9" }}
        />
      )}

      {/* Event header */}
      <div className="flex gap-4">
        {firstDateParts && (
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-xs font-semibold leading-none">
              {firstDateParts.month}
            </span>
            <span className="text-2xl font-bold leading-tight">
              {firstDateParts.day}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-heading font-bold">{event.name}</h1>
          <p className="text-muted-foreground">Hosted by {orgName}</p>
        </div>
      </div>

      {/* Date/time + location */}
      <div className="flex flex-wrap gap-6 text-sm">
        {firstSchedule && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatDate(firstSchedule.date).full}
              {firstSchedule.is_all_day
                ? " · All Day"
                : firstSchedule.start_time
                  ? ` · ${formatTime(firstSchedule.start_time)}${firstSchedule.end_time ? `–${formatTime(firstSchedule.end_time)}` : ""}`
                  : ""}
            </span>
          </div>
        )}
        {event.location_name && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{event.location_name}</span>
          </div>
        )}
      </div>

      <hr />

      {/* Description */}
      {event.description && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">About this Event</h2>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {event.description}
          </p>
        </div>
      )}

      {/* Schedule picker (for multi-day / recurring) */}
      {isMultiSchedule && schedules.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Schedule</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Select the date(s) you&apos;d like to attend:
          </p>
          <div className="space-y-2">
            {schedules.map((s) => {
              const selected = selectedScheduleIds.has(s.id);
              const dateParts = formatDate(s.date);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSchedule(s.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{dateParts.full}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.is_all_day
                        ? "All Day"
                        : s.start_time
                          ? `${formatTime(s.start_time)}${s.end_time ? ` – ${formatTime(s.end_time)}` : ""}`
                          : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pricing & quantity (for paid events) */}
      {!event.is_free && priceTypes.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold">Select Tickets</h2>
            <div className="space-y-3">
              {priceTypes.map((pt) => {
                const qty = quantities[pt.id] ?? 0;
                return (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{pt.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCents(pt.price_cents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQty(pt.id, qty - 1)}
                        disabled={qty === 0}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {qty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setQty(pt.id, qty + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="text-sm font-medium">
            {event.is_free
              ? "Free"
              : minPriceCents != null
                ? `From ${formatCents(minPriceCents)}`
                : ""}
            <span className="ml-2 text-muted-foreground">
              {typeLabel[event.event_type] ?? event.event_type}
            </span>
          </div>
          <Button
            size="lg"
            disabled={!canAddToCart || added}
            onClick={handleAddToCart}
            className="gap-2"
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Added!
              </>
            ) : event.is_free ? (
              "Register"
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
