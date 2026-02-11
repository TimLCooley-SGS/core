import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { MembershipPlanStatus } from "@sgscore/types/tenant";
import { CardEditor } from "../card-editor";

export default async function NewCardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: planData } = await tenant
    .from("membership_plans")
    .select("id, name, status")
    .order("name");

  const plans = (planData ?? []) as {
    id: string;
    name: string;
    status: MembershipPlanStatus;
  }[];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New Membership Card</h2>
      <CardEditor orgSlug={orgSlug} plans={plans} />
    </div>
  );
}
