import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect, notFound } from "next/navigation";
import type {
  MembershipCardDesign,
  MembershipPlanStatus,
} from "@sgscore/types/tenant";
import { CardEditor } from "../card-editor";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; cardId: string }>;
}) {
  const { orgSlug, cardId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: card } = await tenant
    .from("membership_card_designs")
    .select("*")
    .eq("id", cardId)
    .single();

  if (!card) notFound();

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
      <h2 className="text-lg font-semibold">Edit: {(card as MembershipCardDesign).name}</h2>
      <CardEditor
        orgSlug={orgSlug}
        card={card as MembershipCardDesign}
        plans={plans}
      />
    </div>
  );
}
