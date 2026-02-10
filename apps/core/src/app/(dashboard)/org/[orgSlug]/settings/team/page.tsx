import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import { OrgTeamManagement } from "./org-team-management";

export interface StaffMember {
  id: string;
  person_id: string;
  role_id: string;
  status: "active" | "inactive";
  started_at: string;
  person: { id: string; first_name: string; last_name: string; email: string | null };
  role: { id: string; name: string };
}

export interface OrgRole {
  id: string;
  name: string;
  is_system: boolean;
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const [staffResult, rolesResult] = await Promise.all([
    tenant
      .from("staff_assignments")
      .select("id, person_id, role_id, status, started_at, person:persons(id, first_name, last_name, email), role:roles(id, name)")
      .order("started_at", { ascending: false }),
    tenant.from("roles").select("id, name, is_system").order("name"),
  ]);

  const staff = (staffResult.data ?? []) as unknown as StaffMember[];
  const roles = (rolesResult.data ?? []) as OrgRole[];

  return (
    <OrgTeamManagement
      orgSlug={orgSlug}
      staff={staff}
      roles={roles}
    />
  );
}
