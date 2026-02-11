import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { TicketDesign } from "@sgscore/types/tenant";
import { DesignsList } from "./designs-list";

export default async function TicketDesignerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data } = await tenant
    .from("ticket_designs")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const designs = (data ?? []) as TicketDesign[];

  return <DesignsList orgSlug={orgSlug} designs={designs} />;
}
