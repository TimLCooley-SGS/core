import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { Location, BlockedDate } from "@sgscore/types";
import { LocationSettings } from "./location-settings";

export default async function LocationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const [locationsResult, blockedDatesResult] = await Promise.all([
    tenant.from("locations").select("*").order("name"),
    tenant.from("blocked_dates").select("*").order("start_date"),
  ]);

  const locations = (locationsResult.data ?? []) as Location[];
  const blockedDates = (blockedDatesResult.data ?? []) as BlockedDate[];

  return (
    <LocationSettings
      orgSlug={orgSlug}
      locations={locations}
      blockedDates={blockedDates}
    />
  );
}
