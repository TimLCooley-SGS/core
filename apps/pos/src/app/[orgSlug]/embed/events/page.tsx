import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@sgscore/ui";
import { Calendar, MapPin } from "lucide-react";

export default async function EmbedEventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const tenant = getTenantClient(org);

  const { data: eventsRaw } = await tenant
    .from("events")
    .select("id, name, slug, banner_image_url, is_free, event_type, location_id, locations(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12);

  const events = eventsRaw ?? [];

  // Fetch next schedule for each event
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

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => {
        const nextDate = scheduleMap[event.id];
        const locationName = (event.locations as unknown as { name: string } | null)?.name;
        const dateParts = nextDate ? formatDate(nextDate) : null;

        return (
          <Link
            key={event.id}
            href={`/${orgSlug}/events/${event.slug}`}
            target="_top"
          >
            <Card className="overflow-hidden transition-shadow hover:shadow-md">
              {event.banner_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.banner_image_url}
                  alt=""
                  className="w-full object-cover"
                  style={{ aspectRatio: "16 / 9" }}
                />
              )}
              <CardContent className="p-3">
                <div className="flex gap-2">
                  {dateParts && (
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded bg-primary text-primary-foreground">
                      <span className="text-[8px] font-semibold leading-none">
                        {dateParts.month}
                      </span>
                      <span className="text-sm font-bold leading-tight">
                        {dateParts.day}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold line-clamp-1">
                      {event.name}
                    </h3>
                    {locationName && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{locationName}</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
  };
}
