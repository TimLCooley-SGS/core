import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { Location } from "@sgscore/types/tenant";
import { EventEditor } from "../event-editor";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: locationData } = await tenant
    .from("locations")
    .select("*")
    .order("name");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New Event</h2>
      <EventEditor
        orgSlug={orgSlug}
        locations={(locationData ?? []) as Location[]}
      />
    </div>
  );
}
