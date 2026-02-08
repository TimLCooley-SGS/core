import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrgBySlug, resolveCapabilityKeys, getTenantClient } from "@sgscore/api";
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
  const cp = await import("@sgscore/api").then((m) => m.getControlPlaneClient());
  const { data: link } = await cp
    .from("identity_org_links")
    .select("tenant_person_id")
    .eq("global_identity_id", user.id)
    .eq("organization_id", org.id)
    .eq("status", "active")
    .single();

  if (!link) redirect("/org-picker");

  const tenantClient = getTenantClient(org);
  const capabilities = await resolveCapabilityKeys(
    tenantClient,
    link.tenant_person_id,
  );

  return (
    <OrgProvider
      org={{ id: org.id, name: org.name, slug: org.slug }}
      capabilities={capabilities}
    >
      {children}
    </OrgProvider>
  );
}
