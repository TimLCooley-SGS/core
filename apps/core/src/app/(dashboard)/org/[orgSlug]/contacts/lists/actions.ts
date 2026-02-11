"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getOrgBySlug,
  getTenantClient,
  getSgsStaffByIdentity,
  resolveCapabilityKeys,
} from "@sgscore/api";
import type {
  Tag,
  ContactList,
  FilterRules,
  FilterCondition,
  Person,
} from "@sgscore/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function requirePeopleAccess(
  orgSlug: string,
  requiredCap: string,
): Promise<
  | { tenantPersonId: string | null; org: NonNullable<Awaited<ReturnType<typeof getOrgBySlug>>> }
  | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const org = await getOrgBySlug(orgSlug);
  if (!org) return { error: "Organization not found." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (staff) return { tenantPersonId: null, org };

  const cp = getControlPlaneClient();
  const { data: link } = await cp
    .from("identity_org_links")
    .select("tenant_person_id")
    .eq("global_identity_id", user.id)
    .eq("organization_id", org.id)
    .eq("status", "active")
    .single();

  if (!link) return { error: "Not authorized." };

  const tenantClient = getTenantClient(org);
  const capabilities = await resolveCapabilityKeys(
    tenantClient,
    link.tenant_person_id,
  );

  if (
    !capabilities.includes(requiredCap) &&
    !capabilities.includes("people.manage")
  ) {
    return { error: `Not authorized. Requires ${requiredCap} capability.` };
  }

  return { tenantPersonId: link.tenant_person_id, org };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function getTags(orgSlug: string): Promise<Tag[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];
  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("tags")
    .select("*")
    .order("name");
  return (data ?? []) as Tag[];
}

export async function createTag(
  orgSlug: string,
  name: string,
  color: string,
): Promise<{ tag?: Tag; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { data, error } = await tenant
    .from("tags")
    .insert({ name: name.trim(), color })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts`);
  return { tag: data as Tag };
}

export async function deleteTag(
  orgSlug: string,
  tagId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant.from("tags").delete().eq("id", tagId);
  if (error) return { error: error.message };

  revalidatePath(`/org/${orgSlug}/contacts`);
  return {};
}

export async function addPersonTag(
  orgSlug: string,
  personId: string,
  tagId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant
    .from("person_tags")
    .insert({ person_id: personId, tag_id: tagId });

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/people/${personId}`);
  return {};
}

export async function removePersonTag(
  orgSlug: string,
  personId: string,
  tagId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant
    .from("person_tags")
    .delete()
    .eq("person_id", personId)
    .eq("tag_id", tagId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/people/${personId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Lists CRUD
// ---------------------------------------------------------------------------

export async function createList(
  orgSlug: string,
  data: {
    name: string;
    description?: string;
    type: "smart" | "static";
    filter_rules?: FilterRules;
  },
): Promise<{ list?: ContactList; error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { data: list, error } = await tenant
    .from("contact_lists")
    .insert({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      filter_rules: data.filter_rules ?? null,
      created_by: auth.tenantPersonId,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/lists`);
  return { list: list as ContactList };
}

export async function updateList(
  orgSlug: string,
  listId: string,
  data: {
    name?: string;
    description?: string;
    filter_rules?: FilterRules;
  },
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.description !== undefined)
    updates.description = data.description.trim() || null;
  if (data.filter_rules !== undefined) updates.filter_rules = data.filter_rules;

  const { error } = await tenant
    .from("contact_lists")
    .update(updates)
    .eq("id", listId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/lists`);
  return {};
}

export async function deleteList(
  orgSlug: string,
  listId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant
    .from("contact_lists")
    .delete()
    .eq("id", listId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/lists`);
  return {};
}

// ---------------------------------------------------------------------------
// Static list members
// ---------------------------------------------------------------------------

export async function addStaticMember(
  orgSlug: string,
  listId: string,
  personId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant.from("contact_list_members").insert({
    list_id: listId,
    person_id: personId,
    added_by: auth.tenantPersonId,
  });

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/lists/${listId}`);
  return {};
}

export async function removeStaticMember(
  orgSlug: string,
  listId: string,
  personId: string,
): Promise<{ error?: string }> {
  const auth = await requirePeopleAccess(orgSlug, "people.update");
  if ("error" in auth) return { error: auth.error };

  const tenant = getTenantClient(auth.org);
  const { error } = await tenant
    .from("contact_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("person_id", personId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/contacts/lists/${listId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Smart list query builder
// ---------------------------------------------------------------------------

function applySmartFilters(
  tenant: SupabaseClient,
  rules: FilterRules,
): PromiseLike<{ data: Pick<Person, "id" | "first_name" | "last_name" | "email" | "status">[] | null; count: number | null; error: unknown }> {
  let query = tenant
    .from("persons")
    .select("id, first_name, last_name, email, status", { count: "exact" })
    .neq("status", "merged");

  const filters: string[] = [];

  for (const cond of rules.conditions) {
    switch (cond.field) {
      case "status":
        if (cond.op === "eq") filters.push(`status.eq.${cond.value}`);
        else if (cond.op === "neq") filters.push(`status.neq.${cond.value}`);
        break;

      case "name":
        if (cond.op === "contains" && typeof cond.value === "string") {
          // Search across first_name and last_name
          filters.push(`or(first_name.ilike.%${cond.value}%,last_name.ilike.%${cond.value}%)`);
        } else if (cond.op === "not_contains" && typeof cond.value === "string") {
          filters.push(`and(first_name.not.ilike.%${cond.value}%,last_name.not.ilike.%${cond.value}%)`);
        }
        break;

      case "email":
        if (cond.op === "contains" && typeof cond.value === "string") {
          filters.push(`email.ilike.%${cond.value}%`);
        } else if (cond.op === "is_null") {
          filters.push(`email.is.null`);
        } else if (cond.op === "is_not_null") {
          filters.push(`email.not.is.null`);
        }
        break;

      case "created_after":
        if (cond.op === "gte" && typeof cond.value === "string") {
          filters.push(`created_at.gte.${cond.value}`);
        }
        break;

      case "created_before":
        if (cond.op === "lte" && typeof cond.value === "string") {
          filters.push(`created_at.lte.${cond.value}`);
        }
        break;

      // tags, membership_status, has_donated handled via subqueries below
    }
  }

  // Apply direct filters
  if (rules.logic === "or" && filters.length > 0) {
    query = query.or(filters.join(","));
  } else {
    for (const f of filters) {
      // For AND logic, apply each filter individually
      if (f.startsWith("or(") || f.startsWith("and(")) {
        query = query.or(f.slice(3, -1));
      } else {
        const [col, ...rest] = f.split(".");
        const opVal = rest.join(".");
        query = query.filter(col, opVal.split(".")[0], opVal.split(".").slice(1).join("."));
      }
    }
  }

  return query as never;
}

export async function getSmartListCount(
  orgSlug: string,
  rules: FilterRules,
): Promise<{ count: number; error?: string }> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { count: 0, error: "Organization not found." };

  const tenant = getTenantClient(org);

  if (!rules.conditions.length) {
    const { count } = await tenant
      .from("persons")
      .select("id", { count: "exact", head: true })
      .neq("status", "merged");
    return { count: count ?? 0 };
  }

  const result = await applySmartFilters(tenant, rules);
  if (result.error) return { count: 0, error: String(result.error) };
  return { count: result.count ?? result.data?.length ?? 0 };
}

export interface ListMemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
}

export async function getListMembers(
  orgSlug: string,
  listId: string,
): Promise<{ members: ListMemberRow[]; error?: string }> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return { members: [], error: "Organization not found." };

  const tenant = getTenantClient(org);

  // Fetch the list
  const { data: list } = await tenant
    .from("contact_lists")
    .select("*")
    .eq("id", listId)
    .single();

  if (!list) return { members: [], error: "List not found." };

  const contactList = list as ContactList;

  if (contactList.type === "smart" && contactList.filter_rules) {
    const result = await applySmartFilters(tenant, contactList.filter_rules);
    return { members: (result.data ?? []) as ListMemberRow[] };
  }

  // Static list
  const { data: membersData } = await tenant
    .from("contact_list_members")
    .select("person:persons(id, first_name, last_name, email, status)")
    .eq("list_id", listId);

  const members = (membersData ?? []).map(
    (m: unknown) => (m as { person: ListMemberRow }).person,
  ) as ListMemberRow[];

  return { members };
}

// ---------------------------------------------------------------------------
// Search contacts (for static list member picker)
// ---------------------------------------------------------------------------

export async function searchContacts(
  orgSlug: string,
  query: string,
): Promise<ListMemberRow[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);
  const q = query.trim();
  if (!q) return [];

  const { data } = await tenant
    .from("persons")
    .select("id, first_name, last_name, email, status")
    .neq("status", "merged")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(20);

  return (data ?? []) as ListMemberRow[];
}

// ---------------------------------------------------------------------------
// Fetch lists overview
// ---------------------------------------------------------------------------

export interface ListOverviewRow {
  id: string;
  name: string;
  description: string | null;
  type: "smart" | "static";
  filter_rules: FilterRules | null;
  created_at: string;
  member_count: number;
}

export async function getLists(
  orgSlug: string,
): Promise<ListOverviewRow[]> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return [];

  const tenant = getTenantClient(org);

  const { data: lists } = await tenant
    .from("contact_lists")
    .select("id, name, description, type, filter_rules, created_at")
    .order("created_at", { ascending: false });

  if (!lists) return [];

  // Get static member counts
  const staticIds = lists
    .filter((l: { type: string }) => l.type === "static")
    .map((l: { id: string }) => l.id);

  let staticCounts = new Map<string, number>();
  if (staticIds.length > 0) {
    const { data: counts } = await tenant
      .from("contact_list_members")
      .select("list_id")
      .in("list_id", staticIds);

    if (counts) {
      for (const row of counts as { list_id: string }[]) {
        staticCounts.set(row.list_id, (staticCounts.get(row.list_id) ?? 0) + 1);
      }
    }
  }

  // For smart lists, get counts
  const result: ListOverviewRow[] = [];
  for (const list of lists as ContactList[]) {
    let member_count = 0;
    if (list.type === "static") {
      member_count = staticCounts.get(list.id) ?? 0;
    } else if (list.filter_rules && list.filter_rules.conditions.length > 0) {
      const { count } = await getSmartListCount(orgSlug, list.filter_rules);
      member_count = count;
    } else {
      // Smart list with no filters = all non-merged persons
      const { count } = await tenant
        .from("persons")
        .select("id", { count: "exact", head: true })
        .neq("status", "merged");
      member_count = count ?? 0;
    }

    result.push({
      id: list.id,
      name: list.name,
      description: list.description,
      type: list.type,
      filter_rules: list.filter_rules,
      created_at: list.created_at,
      member_count,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Get single list
// ---------------------------------------------------------------------------

export async function getList(
  orgSlug: string,
  listId: string,
): Promise<ContactList | null> {
  const org = await getOrgBySlug(orgSlug);
  if (!org) return null;

  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("contact_lists")
    .select("*")
    .eq("id", listId)
    .single();

  return (data as ContactList) ?? null;
}
