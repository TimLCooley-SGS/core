"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@sgscore/ui";
import { Calendar, MapPin, Minus, Plus, Check, ShoppingCart } from "lucide-react";
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    full: d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    short: d.toLocaleDateString("en-US", {
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
    <div className="space-y-10">
      {/* ── Two-column Luma layout ── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Left column: image + hosted by ── */}
        <div className="space-y-6">
          {event.banner_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.banner_image_url}
              alt=""
              className="w-full rounded-xl object-cover"
              style={{ aspectRatio: "4 / 5" }}
            />
          )}

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Hosted By
              </p>
              <hr className="mt-1" />
            </div>
            <p className="text-sm font-semibold">{orgName}</p>
          </div>

          {/* Price badge */}
          <div className="text-sm font-medium text-muted-foreground">
            {event.is_free
              ? "Free"
              : minPriceCents != null
                ? `From ${formatCents(minPriceCents)}`
                : ""}
          </div>
        </div>

        {/* ── Right column: title + details + description ── */}
        <div className="space-y-6">
          {/* Title */}
          <h1 className="text-4xl font-heading font-bold leading-tight lg:text-5xl">
            {event.name}
          </h1>

          {/* Date & time */}
          {firstSchedule && firstDateParts && (
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-background">
                <span className="text-[10px] font-semibold uppercase leading-none text-primary">
                  {firstDateParts.month}
                </span>
                <span className="text-base font-bold leading-tight">
                  {firstDateParts.day}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">{firstDateParts.full}</p>
                <p className="text-sm text-muted-foreground">
                  {firstSchedule.is_all_day
                    ? "All Day"
                    : firstSchedule.start_time
                      ? `${formatTime(firstSchedule.start_time)}${firstSchedule.end_time ? ` - ${formatTime(firstSchedule.end_time)}` : ""}`
                      : ""}
                </p>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location_name && (
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-background">
                <MapPin className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">{event.location_name}</p>
              </div>
            </div>
          )}

          {/* Registration / Cart card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              {/* Schedule picker (multi-day / recurring) */}
              {isMultiSchedule && schedules.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Select Dates</p>
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
                            <p className="text-sm font-medium">{dateParts.short}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.is_all_day
                                ? "All Day"
                                : s.start_time
                                  ? `${formatTime(s.start_time)}${s.end_time ? ` - ${formatTime(s.end_time)}` : ""}`
                                  : ""}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price tiers (paid events) */}
              {!event.is_free && priceTypes.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Tickets</p>
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
              )}

              {/* Register / Add to Cart button */}
              <Button
                size="lg"
                disabled={!canAddToCart || added}
                onClick={handleAddToCart}
                className="w-full gap-2"
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
            </CardContent>
          </Card>

          {/* About Event */}
          {event.description && (
            <div>
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  About Event
                </p>
                <hr className="mt-1" />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
