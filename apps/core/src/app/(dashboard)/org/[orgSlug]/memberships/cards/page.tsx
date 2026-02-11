import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { MembershipCardDesign } from "@sgscore/types/tenant";
import { CardsList } from "./cards-list";

export default async function CardsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data } = await tenant
    .from("membership_card_designs")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const cards = (data ?? []) as MembershipCardDesign[];

  return <CardsList orgSlug={orgSlug} cards={cards} />;
}
