import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@sgscore/ui";
import { EventsClient } from "./events-client";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const tenant = getTenantClient(org);

  // Fetch active events with their locations
  const { data: eventsRaw } = await tenant
    .from("events")
    .select("id, name, slug, banner_image_url, is_free, event_type, location_id, locations(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const events = eventsRaw ?? [];

  // Fetch next upcoming schedule for each event
  const today = new Date().toISOString().split("T")[0];
  const eventIds = events.map((e) => e.id);

  let scheduleMap: Record<string, string> = {};
  if (eventIds.length > 0) {
    const { data: schedules } = await tenant
      .from("event_schedules")
      .select("event_id, date")
      .in("event_id", eventIds)
      .gte("date", today)
      .eq("is_cancelled", false)
      .order("date")
      .limit(200);

    if (schedules) {
      for (const s of schedules) {
        if (!scheduleMap[s.event_id]) {
          scheduleMap[s.event_id] = s.date;
        }
      }
    }
  }

  // Fetch min prices
  let priceMap: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: prices } = await tenant
      .from("event_price_types")
      .select("event_id, price_cents")
      .in("event_id", eventIds)
      .order("price_cents");

    if (prices) {
      for (const p of prices) {
        if (priceMap[p.event_id] === undefined || p.price_cents < priceMap[p.event_id]) {
          priceMap[p.event_id] = p.price_cents;
        }
      }
    }
  }

  const enrichedEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    banner_image_url: e.banner_image_url,
    is_free: e.is_free,
    event_type: e.event_type,
    location_name: (e.locations as unknown as { name: string } | null)?.name ?? null,
    next_date: scheduleMap[e.id] ?? null,
    min_price_cents: priceMap[e.id] ?? null,
  }));

  if (enrichedEvents.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Events</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No Upcoming Events</p>
              <p className="text-sm text-muted-foreground">
                Check back soon for upcoming events and activities.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Events</h1>
      <EventsClient orgSlug={orgSlug} events={enrichedEvents} />
    </div>
  );
}
