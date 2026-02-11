import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { notFound, redirect } from "next/navigation";
import { ContactDetail } from "./contact-detail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PersonDetail {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: "active" | "inactive" | "merged";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMemberRow {
  id: string;
  role: string;
  household: { id: string; name: string | null };
  person: { id: string; first_name: string; last_name: string };
}

export interface DonationRow {
  id: string;
  amount_cents: number;
  currency: string;
  campaign: string | null;
  donation_date: string;
  notes: string | null;
}

export interface VisitRow {
  id: string;
  visit_type: string;
  visited_at: string;
  notes: string | null;
}

export interface MembershipSeatRow {
  id: string;
  seat_number: number;
  assigned_at: string | null;
  membership: {
    id: string;
    status: string;
    starts_at: string;
    ends_at: string;
    plan: {
      id: string;
      name: string;
      price_cents: number;
      currency: string;
    };
  };
}

export interface AuditLogRow {
  id: string;
  actor_person_id: string | null;
  actor_type: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; personId: string }>;
}) {
  const { orgSlug, personId } = await params;

  if (!UUID_RE.test(personId)) notFound();

  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const [personResult, householdMembersResult, donationsResult, visitsResult, seatsResult, auditResult] =
    await Promise.all([
      tenant
        .from("persons")
        .select(
          "id, first_name, last_name, display_name, email, phone, date_of_birth, address_line1, address_line2, city, state, postal_code, country, status, metadata, created_at, updated_at",
        )
        .eq("id", personId)
        .single(),
      tenant
        .from("household_members")
        .select(
          "id, role, household:households(id, name), person:persons(id, first_name, last_name)",
        )
        .eq("person_id", personId)
        .is("removed_at", null),
      tenant
        .from("donations")
        .select("id, amount_cents, currency, campaign, donation_date, notes")
        .eq("person_id", personId)
        .order("donation_date", { ascending: false }),
      tenant
        .from("visits")
        .select("id, visit_type, visited_at, notes")
        .eq("person_id", personId)
        .order("visited_at", { ascending: false }),
      tenant
        .from("membership_seats")
        .select(
          "id, seat_number, assigned_at, membership:memberships(id, status, starts_at, ends_at, plan:membership_plans(id, name, price_cents, currency))",
        )
        .eq("person_id", personId),
      tenant
        .from("audit_log")
        .select(
          "id, actor_person_id, actor_type, action, table_name, record_id, old_values, new_values, created_at",
        )
        .or(`record_id.eq.${personId},actor_person_id.eq.${personId}`)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (!personResult.data) notFound();

  const person = personResult.data as unknown as PersonDetail;
  const householdMembers = (householdMembersResult.data ?? []) as unknown as HouseholdMemberRow[];
  const donations = (donationsResult.data ?? []) as DonationRow[];
  const visits = (visitsResult.data ?? []) as VisitRow[];
  const seats = (seatsResult.data ?? []) as unknown as MembershipSeatRow[];
  const auditLog = (auditResult.data ?? []) as AuditLogRow[];

  // Fetch household peers: other members of the same households
  const householdIds = householdMembers.map((hm) => hm.household.id);
  let householdPeers: HouseholdMemberRow[] = [];
  if (householdIds.length > 0) {
    const { data: peersData } = await tenant
      .from("household_members")
      .select(
        "id, role, household:households(id, name), person:persons(id, first_name, last_name)",
      )
      .in("household_id", householdIds)
      .neq("person_id", personId)
      .is("removed_at", null);
    householdPeers = (peersData ?? []) as unknown as HouseholdMemberRow[];
  }

  return (
    <ContactDetail
      orgSlug={orgSlug}
      person={person}
      householdMembers={householdMembers}
      householdPeers={householdPeers}
      donations={donations}
      visits={visits}
      seats={seats}
      auditLog={auditLog}
    />
  );
}
