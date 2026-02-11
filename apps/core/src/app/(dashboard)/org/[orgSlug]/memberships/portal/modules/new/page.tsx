import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { MembershipCardDesign } from "@sgscore/types/tenant";
import { ModuleEditor } from "../module-editor";

export default async function NewModulePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: cardData } = await tenant
    .from("membership_card_designs")
    .select("*")
    .eq("status", "active")
    .order("name");

  const cardDesigns = (cardData ?? []) as MembershipCardDesign[];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New Module</h2>
      <ModuleEditor orgSlug={orgSlug} cardDesigns={cardDesigns} />
    </div>
  );
}
