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
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

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

  const initials = (
    user.user_metadata?.display_name ??
    user.email ??
    "?"
  )
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Fetch avatar URL from control plane
  const cpForAvatar = getControlPlaneClient();
  const { data: identity } = await cpForAvatar
    .from("global_identities")
    .select("avatar_url")
    .eq("id", user.id)
    .single();
  const avatarUrl = (identity?.avatar_url as string) ?? null;

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
      supabaseUrl={org.supabase_url ?? ""}
      supabaseAnonKey={org.supabase_anon_key ?? ""}
    >
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar initials={initials} avatarUrl={avatarUrl} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </OrgProvider>
  );
}
