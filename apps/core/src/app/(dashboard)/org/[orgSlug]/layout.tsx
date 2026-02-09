import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOrgBySlug,
  getControlPlaneClient,
  resolveCapabilityKeys,
  getTenantClient,
  getSgsStaffByIdentity,
} from "@sgscore/api";
import { OrgProvider } from "@/components/org-provider";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  // Resolve user's capabilities for this org
  const cp = getControlPlaneClient();
  const { data: link } = await cp
    .from("identity_org_links")
    .select("tenant_person_id")
    .eq("global_identity_id", user.id)
    .eq("organization_id", org.id)
    .eq("status", "active")
    .single();

  let capabilities: string[];

  if (link) {
    // Normal user — resolve capabilities from their role assignments
    const tenantClient = getTenantClient(org);
    capabilities = await resolveCapabilityKeys(tenantClient, link.tenant_person_id);
  } else {
    // No identity_org_link — check if platform staff
    const staff = await getSgsStaffByIdentity(user.id);
    if (!staff) redirect("/org-picker");

    // Staff gets all capabilities
    const tenantClient = getTenantClient(org);
    const { data: allCaps } = await tenantClient
      .from("capabilities")
      .select("key");

    capabilities = (allCaps ?? []).map((c) => c.key as string);
  }

  return (
    <OrgProvider
      org={{ id: org.id, name: org.name, slug: org.slug }}
      capabilities={capabilities}
    >
      {children}
    </OrgProvider>
  );
}
