import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { notFound } from "next/navigation";
import { EventDetail } from "./event-detail";
import { EventCard } from "../event-card";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const tenant = getTenantClient(org);

  // Fetch the event by slug
  const { data: event } = await tenant
    .from("events")
    .select("id, name, slug, description, event_type, location_id, banner_image_url, square_image_url, capacity, is_free, registration_required, enable_check_in, status, locations(name)")
    .eq("slug", eventSlug)
    .eq("status", "active")
    .single();

  if (!event) notFound();

  // Fetch upcoming schedules (non-cancelled, today or future)
  const today = new Date().toISOString().split("T")[0];
  const { data: schedulesRaw } = await tenant
    .from("event_schedules")
    .select("id, date, start_time, end_time, is_all_day, is_cancelled, capacity_override")
    .eq("event_id", event.id)
    .eq("is_cancelled", false)
    .gte("date", today)
    .order("date")
    .limit(50);

  const schedules = schedulesRaw ?? [];

  // Fetch price types
  const { data: priceTypesRaw } = await tenant
    .from("event_price_types")
    .select("id, name, price_cents, tax_rate, capacity, sort_order")
    .eq("event_id", event.id)
    .order("sort_order");

  const priceTypes = priceTypesRaw ?? [];

  // Fetch 4 other upcoming events for "More Events" section
  const { data: otherEventsRaw } = await tenant
    .from("events")
    .select("id, name, slug, banner_image_url, is_free, event_type, location_id, locations(name)")
    .eq("status", "active")
    .neq("id", event.id)
    .order("created_at", { ascending: false })
    .limit(4);

  const otherEvents = otherEventsRaw ?? [];

  // Get next schedule date + min price for other events
  const otherIds = otherEvents.map((e) => e.id);
  let otherScheduleMap: Record<string, string> = {};
  let otherPriceMap: Record<string, number> = {};

  if (otherIds.length > 0) {
    const { data: otherSchedules } = await tenant
      .from("event_schedules")
      .select("event_id, date")
      .in("event_id", otherIds)
      .gte("date", today)
      .eq("is_cancelled", false)
      .order("date")
      .limit(100);

    if (otherSchedules) {
      for (const s of otherSchedules) {
        if (!otherScheduleMap[s.event_id]) {
          otherScheduleMap[s.event_id] = s.date;
        }
      }
    }

    const { data: otherPrices } = await tenant
      .from("event_price_types")
      .select("event_id, price_cents")
      .in("event_id", otherIds)
      .order("price_cents");

    if (otherPrices) {
      for (const p of otherPrices) {
        if (otherPriceMap[p.event_id] === undefined || p.price_cents < otherPriceMap[p.event_id]) {
          otherPriceMap[p.event_id] = p.price_cents;
        }
      }
    }
  }

  const enrichedOtherEvents = otherEvents.map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    banner_image_url: e.banner_image_url,
    is_free: e.is_free,
    event_type: e.event_type,
    location_name: (e.locations as unknown as { name: string } | null)?.name ?? null,
    next_date: otherScheduleMap[e.id] ?? null,
    min_price_cents: otherPriceMap[e.id] ?? null,
  }));

  return (
    <div className="space-y-12">
      <EventDetail
        orgSlug={orgSlug}
        orgName={org.name}
        event={{
          id: event.id,
          name: event.name,
          slug: event.slug,
          description: event.description,
          event_type: event.event_type,
          banner_image_url: event.banner_image_url,
          is_free: event.is_free,
          capacity: event.capacity,
          location_name: (event.locations as unknown as { name: string } | null)?.name ?? null,
        }}
        schedules={schedules}
        priceTypes={priceTypes}
      />

      {enrichedOtherEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-heading font-bold">More Events</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {enrichedOtherEvents.map((e) => (
              <EventCard key={e.id} orgSlug={orgSlug} event={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
