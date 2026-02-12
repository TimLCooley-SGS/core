import { getOrgBySlug } from "@sgscore/api";
import { redirect } from "next/navigation";
import type { OrgBranding, PosNavItem } from "@sgscore/types";
import { ThemeEditor } from "./general-form";

export default async function GeneralPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Partial<OrgBranding>;
  const posNavigation = (settings.posNavigation as PosNavItem[] | undefined) ?? null;

  return (
    <ThemeEditor
      orgSlug={orgSlug}
      orgName={org.name}
      branding={branding}
      posNavigation={posNavigation}
    />
  );
}
