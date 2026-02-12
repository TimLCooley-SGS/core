import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { MembershipPlan } from "@sgscore/types/tenant";
import { PlansList } from "./plans-list";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data } = await tenant
    .from("membership_plans")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const plans = (data ?? []) as MembershipPlan[];

  return <PlansList orgSlug={orgSlug} plans={plans} />;
}
