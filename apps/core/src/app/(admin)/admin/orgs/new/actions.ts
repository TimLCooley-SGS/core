"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";

interface CreateOrgState {
  error?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganization(
  _prev: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized." };

  const name = (formData.get("name") as string)?.trim();
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!name) {
    return { error: "Organization name is required." };
  }

  if (!firstName || !lastName || !email) {
    return { error: "Contact first name, last name, and email are required." };
  }

  // Generate slug from org name
  const baseSlug = slugify(name);

  if (baseSlug.length < 2) {
    return {
      error: "Organization name is too short to generate a valid URL slug.",
    };
  }

  const cp = getControlPlaneClient();

  // Find a unique slug — append a suffix if the base slug is taken
  let slug = baseSlug;
  const { data: conflicts } = await cp
    .from("organizations")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (conflicts && conflicts.length > 0) {
    const taken = new Set(conflicts.map((r) => r.slug));
    if (taken.has(baseSlug)) {
      let suffix = 2;
      while (taken.has(`${baseSlug}-${suffix}`)) {
        suffix++;
      }
      slug = `${baseSlug}-${suffix}`;
    }
  }

  // Invite user via Supabase Auth (sends magic link email)
  const fullName = `${firstName} ${lastName}`;
  let authUserId: string;

  const { data: inviteData, error: inviteError } =
    await cp.auth.admin.inviteUserByEmail(email, {
      data: { display_name: fullName },
    });

  if (inviteError) {
    // User already exists — look up their ID
    if (inviteError.message?.includes("already been registered")) {
      const { data: listData, error: listError } =
        await cp.auth.admin.listUsers();

      if (listError) {
        return { error: `Failed to look up existing user: ${listError.message}` };
      }

      const existingUser = listData.users.find(
        (u) => u.email?.toLowerCase() === email,
      );

      if (!existingUser) {
        return { error: "User appears to exist but could not be found." };
      }

      authUserId = existingUser.id;
    } else {
      return { error: `Failed to invite user: ${inviteError.message}` };
    }
  } else {
    authUserId = inviteData.user.id;
  }

  // Upsert global identity
  await cp.from("global_identities").upsert(
    {
      id: authUserId,
      primary_email: email,
      display_name: fullName,
    },
    { onConflict: "id" },
  );

  // Create the organization with pending admin in settings
  const { data: org, error: insertError } = await cp
    .from("organizations")
    .insert({
      name,
      slug,
      status: "provisioning",
      settings: {
        pending_admin: {
          global_identity_id: authUserId,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          email,
        },
      },
    })
    .select("id")
    .single();

  if (insertError || !org) {
    return { error: `Failed to create organization: ${insertError?.message ?? "Unknown error"}` };
  }

  // Write audit log
  await cp.from("platform_audit_log").insert({
    actor_id: user.id,
    action: "org.created",
    resource_type: "organization",
    resource_id: org.id,
    metadata: { name, slug, admin_email: email },
  });

  redirect(`/admin/orgs/${org.id}`);
}
