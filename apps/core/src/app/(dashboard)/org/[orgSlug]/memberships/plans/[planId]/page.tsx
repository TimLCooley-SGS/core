import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { MembershipPlan } from "@sgscore/types/tenant";
import { PlanEditor } from "../plan-editor";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ orgSlug: string; planId: string }>;
}) {
  const { orgSlug, planId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data } = await tenant
    .from("membership_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!data) redirect(`/org/${orgSlug}/memberships/plans`);

  const plan = data as MembershipPlan;

  return <PlanEditor orgSlug={orgSlug} plan={plan} />;
}
