import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { Location, BlockedDate } from "@sgscore/types/tenant";
import { TicketEditor } from "../ticket-editor";

export default async function NewTicketPage({
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

  const { data: blockedData } = await tenant
    .from("blocked_dates")
    .select("*")
    .order("start_date");

  const { data: sysTemplates } = await tenant
    .from("email_templates")
    .select("id, name, system_key")
    .eq("is_system", true)
    .like("system_key", "ticket_%");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New Ticket</h2>
      <TicketEditor
        orgSlug={orgSlug}
        locations={(locationData ?? []) as Location[]}
        blockedDates={(blockedData ?? []) as BlockedDate[]}
        systemEmailTemplates={(sysTemplates ?? []) as { system_key: string; id: string; name: string }[]}
      />
    </div>
  );
}
