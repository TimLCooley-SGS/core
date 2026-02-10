import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { redirect } from "next/navigation";
import { ContactsList } from "./contacts-list";

export interface ContactPerson {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: "active" | "inactive" | "merged";
  date_of_birth: string | null;
  created_at: string;
}

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  const tenant = getTenantClient(org);

  const { data } = await tenant
    .from("persons")
    .select("id, first_name, last_name, email, phone, status, date_of_birth, created_at")
    .neq("status", "merged")
    .order("last_name")
    .order("first_name");

  const persons = (data ?? []) as ContactPerson[];

  return <ContactsList orgSlug={orgSlug} persons={persons} />;
}
