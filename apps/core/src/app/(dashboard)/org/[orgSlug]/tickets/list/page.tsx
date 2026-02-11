import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { TicketType } from "@sgscore/types/tenant";
import { TicketsList } from "./tickets-list";

export default async function TicketsListPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data } = await tenant
    .from("ticket_types")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const tickets = (data ?? []) as TicketType[];

  return <TicketsList orgSlug={orgSlug} tickets={tickets} />;
}
