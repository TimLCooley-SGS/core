import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect, notFound } from "next/navigation";
import type { TicketDesign } from "@sgscore/types/tenant";
import { DesignEditor } from "../design-editor";

export default async function EditTicketDesignPage({
  params,
}: {
  params: Promise<{ orgSlug: string; designId: string }>;
}) {
  const { orgSlug, designId } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data: design } = await tenant
    .from("ticket_designs")
    .select("*")
    .eq("id", designId)
    .single();

  if (!design) notFound();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Edit: {(design as TicketDesign).name}
      </h2>
      <DesignEditor orgSlug={orgSlug} design={design as TicketDesign} />
    </div>
  );
}
