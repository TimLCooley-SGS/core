import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect, notFound } from "next/navigation";
import type { PortalModule, MembershipCardDesign } from "@sgscore/types/tenant";
import { ModuleEditor } from "../module-editor";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ orgSlug: string; moduleId: string }>;
}) {
  const { orgSlug, moduleId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const [moduleRes, cardRes] = await Promise.all([
    tenant
      .from("portal_modules")
      .select("*")
      .eq("id", moduleId)
      .single(),
    tenant
      .from("membership_card_designs")
      .select("*")
      .eq("status", "active")
      .order("name"),
  ]);

  if (!moduleRes.data) notFound();

  const mod = moduleRes.data as PortalModule;
  const cardDesigns = (cardRes.data ?? []) as MembershipCardDesign[];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Edit: {mod.title}</h2>
      <ModuleEditor orgSlug={orgSlug} module={mod} cardDesigns={cardDesigns} />
    </div>
  );
}
