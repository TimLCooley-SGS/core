import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import { RegistrationsList } from "./registrations-list";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: events } = await tenant
    .from("events")
    .select("id, name, status")
    .neq("status", "archived")
    .order("name");

  const { data: registrations } = await tenant
    .from("event_registrations")
    .select("*, events(id, name), event_schedules(date), persons(first_name, last_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <RegistrationsList
      orgSlug={orgSlug}
      events={(events ?? []) as { id: string; name: string; status: string }[]}
      registrations={(registrations ?? []) as Record<string, unknown>[]}
    />
  );
}
