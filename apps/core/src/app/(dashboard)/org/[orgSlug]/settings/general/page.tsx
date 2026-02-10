import { getOrgBySlug } from "@sgscore/api";
import { redirect } from "next/navigation";
import { GeneralForm } from "./general-form";

export default async function GeneralPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Record<string, unknown>;
  const logoUrl = (branding.logoUrl as string) ?? null;

  return (
    <GeneralForm orgSlug={orgSlug} orgName={org.name} logoUrl={logoUrl} />
  );
}
