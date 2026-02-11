import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import type {
  PortalSettings,
  PortalModule,
  PortalAnnouncement,
  PortalQuestion,
  MembershipCardDesign,
} from "@sgscore/types/tenant";
import { PortalTabs } from "./portal-tabs";

export default async function MembershipPortalPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  // Fetch all portal data in parallel
  const [settingsRes, modulesRes, announcementsRes, questionsRes, cardDesignsRes] =
    await Promise.all([
      tenant.from("portal_settings").select("*").limit(1).maybeSingle(),
      tenant
        .from("portal_modules")
        .select("*")
        .neq("status", "archived")
        .order("sort_order", { ascending: true }),
      tenant
        .from("portal_announcements")
        .select("*")
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      tenant
        .from("portal_questions")
        .select("*, persons:person_id(first_name, last_name)")
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      tenant
        .from("membership_card_designs")
        .select("*")
        .eq("status", "active")
        .order("name"),
    ]);

  const settings = (settingsRes.data as PortalSettings | null) ?? null;
  const modules = (modulesRes.data ?? []) as PortalModule[];
  const announcements = (announcementsRes.data ?? []) as PortalAnnouncement[];
  const cardDesigns = (cardDesignsRes.data ?? []) as MembershipCardDesign[];

  // Map questions with person names
  const questions = ((questionsRes.data ?? []) as (PortalQuestion & {
    persons?: { first_name: string; last_name: string } | null;
  })[]).map((q) => ({
    ...q,
    person_name: q.persons
      ? `${q.persons.first_name} ${q.persons.last_name}`
      : "Unknown",
    persons: undefined,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Membership Portal</h2>
      <PortalTabs
        orgSlug={orgSlug}
        settings={settings}
        modules={modules}
        announcements={announcements}
        questions={questions}
        cardDesigns={cardDesigns}
      />
    </div>
  );
}
