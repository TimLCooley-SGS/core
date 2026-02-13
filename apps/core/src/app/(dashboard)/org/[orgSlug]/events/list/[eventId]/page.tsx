import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect, notFound } from "next/navigation";
import type {
  Event,
  EventSchedule,
  EventRecurrenceRule,
  EventPriceType,
  Location,
} from "@sgscore/types/tenant";
import { EventEditor } from "../event-editor";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: event } = await tenant
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: scheduleData } = await tenant
    .from("event_schedules")
    .select("*")
    .eq("event_id", eventId)
    .order("date");

  const { data: ruleData } = await tenant
    .from("event_recurrence_rules")
    .select("*")
    .eq("event_id", eventId)
    .limit(1)
    .single();

  const { data: priceData } = await tenant
    .from("event_price_types")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  const { data: locationData } = await tenant
    .from("locations")
    .select("*")
    .order("name");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Edit: {(event as Event).name}
      </h2>
      <EventEditor
        orgSlug={orgSlug}
        locations={(locationData ?? []) as Location[]}
        event={event as Event}
        schedules={(scheduleData ?? []) as EventSchedule[]}
        recurrenceRule={(ruleData as EventRecurrenceRule) ?? undefined}
        priceTypes={(priceData ?? []) as EventPriceType[]}
      />
    </div>
  );
}
