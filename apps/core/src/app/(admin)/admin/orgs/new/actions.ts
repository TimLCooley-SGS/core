"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity, sendEmail } from "@sgscore/api";
import {
  createSupabaseProject,
  supabaseMgmtFetch,
  getApiKeys,
  deleteSupabaseProject,
  runTenantMigrations,
  setupPendingAdminTenant,
  getPoolerHost,
  buildTenantDbUrl,
  type PendingAdmin,
} from "@sgscore/api/provisioning";

export interface CreateStepResult {
  ok: boolean;
  error?: string;
  orgId?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized." };
  return { userId: user.id };
}

// ---------------------------------------------------------------------------
// Step 1: Validate form, create user, create org record
// ---------------------------------------------------------------------------

export async function createStep_Setup(
  formData: FormData,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!name) return { ok: false, error: "Organization name is required." };
  if (!firstName || !lastName || !email) {
    return { ok: false, error: "Contact first name, last name, and email are required." };
  }

  const baseSlug = slugify(name);
  if (baseSlug.length < 2) {
    return { ok: false, error: "Organization name is too short to generate a valid URL slug." };
  }

  const cp = getControlPlaneClient();

  // Find a unique slug
  let slug = baseSlug;
  const { data: conflicts } = await cp
    .from("organizations")
    .select("slug")
    .like("slug", `${baseSlug}%`);

  if (conflicts && conflicts.length > 0) {
    const taken = new Set(conflicts.map((r) => r.slug));
    if (taken.has(baseSlug)) {
      let suffix = 2;
      while (taken.has(`${baseSlug}-${suffix}`)) suffix++;
      slug = `${baseSlug}-${suffix}`;
    }
  }

  // Create user without sending email
  const fullName = `${firstName} ${lastName}`;
  let authUserId: string;

  const { data: createData, error: createError } =
    await cp.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: fullName },
    });

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      const { data: listData, error: listError } =
        await cp.auth.admin.listUsers();
      if (listError) {
        return { ok: false, error: `Failed to look up existing user: ${listError.message}` };
      }
      const existingUser = listData.users.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (!existingUser) {
        return { ok: false, error: "User appears to exist but could not be found." };
      }
      authUserId = existingUser.id;
    } else {
      return { ok: false, error: `Failed to create user: ${createError.message}` };
    }
  } else {
    authUserId = createData.user.id;
  }

  // Upsert global identity
  await cp.from("global_identities").upsert(
    { id: authUserId, primary_email: email, display_name: fullName },
    { onConflict: "id" },
  );

  // Create org record
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
    return { ok: false, error: `Failed to create organization: ${insertError?.message ?? "Unknown error"}` };
  }

  // Audit log
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.created",
    resource_type: "organization",
    resource_id: org.id,
    metadata: { name, slug, admin_email: email },
  });

  return { ok: true, orgId: org.id };
}

// ---------------------------------------------------------------------------
// Step 2: Create Supabase project
// ---------------------------------------------------------------------------

export async function createStep_CreateProject(
  orgId: string,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .single();
  if (!org) return { ok: false, error: "Organization not found." };

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) return { ok: false, error: "SUPABASE_DB_PASSWORD is required." };

  try {
    const project = await createSupabaseProject(`sgscore-${org.slug}`, dbPassword);
    await cp
      .from("organizations")
      .update({ supabase_project_id: project.id })
      .eq("id", orgId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create project" };
  }
}

// ---------------------------------------------------------------------------
// Step 3: Check if project is ready (client polls this repeatedly)
// ---------------------------------------------------------------------------

export async function createStep_CheckProjectReady(
  orgId: string,
): Promise<CreateStepResult & { ready?: boolean }> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("supabase_project_id")
    .eq("id", orgId)
    .single();
  if (!org?.supabase_project_id) return { ok: false, error: "No Supabase project found." };

  try {
    const res = await supabaseMgmtFetch(`/projects/${org.supabase_project_id}`);
    const project = (await res.json()) as { status: string };
    return { ok: true, ready: project.status === "ACTIVE_HEALTHY" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to check project status" };
  }
}

// ---------------------------------------------------------------------------
// Step 4: Get API keys + run migrations
// ---------------------------------------------------------------------------

export async function createStep_ConfigureDb(
  orgId: string,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) return { ok: false, error: "SUPABASE_DB_PASSWORD is required." };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("supabase_project_id")
    .eq("id", orgId)
    .single();
  if (!org?.supabase_project_id) return { ok: false, error: "No Supabase project found." };

  try {
    const keys = await getApiKeys(org.supabase_project_id);
    const supabaseUrl = `https://${org.supabase_project_id}.supabase.co`;
    const pooler = await getPoolerHost(org.supabase_project_id);
    const tenantDbUrl = buildTenantDbUrl(org.supabase_project_id, dbPassword, pooler.host, pooler.port);

    await runTenantMigrations(tenantDbUrl, { seed: true });

    await cp
      .from("organizations")
      .update({
        supabase_url: supabaseUrl,
        supabase_anon_key: keys.anon,
        supabase_service_key: keys.service_role,
      })
      .eq("id", orgId);

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to configure database" };
  }
}

// ---------------------------------------------------------------------------
// Step 5: Set up admin in tenant DB + create identity_org_link
// ---------------------------------------------------------------------------

export async function createStep_SetupAdmin(
  orgId: string,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) return { ok: false, error: "SUPABASE_DB_PASSWORD is required." };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("supabase_project_id, settings")
    .eq("id", orgId)
    .single();
  if (!org?.supabase_project_id) return { ok: false, error: "No Supabase project found." };

  const admin = (org.settings as { pending_admin?: PendingAdmin })?.pending_admin;
  if (!admin) return { ok: false, error: "No pending admin found in org settings." };

  try {
    const pooler = await getPoolerHost(org.supabase_project_id);
    const tenantDbUrl = buildTenantDbUrl(org.supabase_project_id, dbPassword, pooler.host, pooler.port);
    const personId = await setupPendingAdminTenant(tenantDbUrl, admin);

    await cp.from("identity_org_links").insert({
      global_identity_id: admin.global_identity_id,
      organization_id: orgId,
      tenant_person_id: personId,
      has_staff_access: true,
      has_patron_access: true,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to set up admin" };
  }
}

// ---------------------------------------------------------------------------
// Step 6: Activate organization
// ---------------------------------------------------------------------------

export async function createStep_Activate(
  orgId: string,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("name, slug")
    .eq("id", orgId)
    .single();

  await cp
    .from("organizations")
    .update({ status: "active" })
    .eq("id", orgId);

  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "org.provisioned",
    resource_type: "organization",
    resource_id: orgId,
    metadata: { name: org?.name, slug: org?.slug },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Step 7: Send welcome email
// ---------------------------------------------------------------------------

export async function createStep_SendWelcome(
  orgId: string,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("name, settings")
    .eq("id", orgId)
    .single();
  if (!org) return { ok: false, error: "Organization not found." };

  const admin = (org.settings as { pending_admin?: PendingAdmin })?.pending_admin;
  if (!admin) return { ok: true }; // No admin to email — not an error

  const { data: linkData, error: linkError } = await cp.auth.admin.generateLink({
    type: "magiclink",
    email: admin.email,
  });

  if (linkError) {
    return { ok: false, error: `Failed to generate login link: ${linkError.message}` };
  }

  const magicLink = linkData?.properties?.action_link;

  try {
    await sendEmail({
      to: admin.email,
      subject: `Welcome to ${org.name} on SGS Core`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;background:#f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:24px 32px;background:#702B9E;text-align:center;">
          <h2 style="margin:0;color:#ffffff;">SGS Core</h2>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#702B9E;">Welcome, ${admin.first_name}!</h1>
          <p style="margin:0 0 16px;color:#555;">Your organization <strong>${org.name}</strong> has been set up and is ready to go.</p>
          <p style="margin:0 0 24px;color:#555;">You've been assigned as the organization admin. Click the button below to sign in and get started.</p>
          ${magicLink ? `<p style="text-align:center;margin:24px 0;"><a href="${magicLink}" style="display:inline-block;padding:12px 32px;background:#702B9E;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Sign In to SGS Core</a></p>` : `<p style="margin:0 0 16px;color:#555;">Visit <strong>sgscore-core.vercel.app</strong> and sign in with this email address to get started.</p>`}
          <p style="margin:16px 0 0;font-size:13px;color:#999;">If you didn't expect this email, you can safely ignore it.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center;">
          Sent by <a href="https://sgscore.com" style="color:#702B9E;text-decoration:none;">SGS Core</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (emailErr) {
    return {
      ok: false,
      error: `Failed to send email: ${emailErr instanceof Error ? emailErr.message : "Unknown error"}`,
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cleanup: delete Supabase project + archive org on failure
// ---------------------------------------------------------------------------

export async function createStep_Cleanup(
  orgId: string,
): Promise<CreateStepResult> {
  const auth = await requireStaff();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cp = getControlPlaneClient();
  const { data: org } = await cp
    .from("organizations")
    .select("supabase_project_id")
    .eq("id", orgId)
    .single();

  if (org?.supabase_project_id) {
    try {
      await deleteSupabaseProject(org.supabase_project_id);
    } catch (err) {
      console.warn("Failed to clean up Supabase project:", err);
    }
  }

  await cp
    .from("organizations")
    .update({ status: "archived" })
    .eq("id", orgId);

  return { ok: true };
}
