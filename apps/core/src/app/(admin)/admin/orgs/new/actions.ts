"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity, sendEmail } from "@sgscore/api";
import { provisionOrg } from "@sgscore/api/provisioning";

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

  // Create user without sending email — we'll send the welcome email after provisioning
  const fullName = `${firstName} ${lastName}`;
  let authUserId: string;

  const { data: createData, error: createError } =
    await cp.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: fullName },
    });

  if (createError) {
    // User already exists — look up their ID
    if (createError.message?.includes("already been registered")) {
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
      return { error: `Failed to create user: ${createError.message}` };
    }
  } else {
    authUserId = createData.user.id;
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

  // Provision the Supabase project inline (30-120s)
  try {
    await provisionOrg(org.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Organization created but provisioning failed: ${message}. The org has been archived.` };
  }

  // Provisioning succeeded — send welcome email with magic link
  try {
    const { data: linkData } = await cp.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const magicLink = linkData?.properties?.action_link;

    await sendEmail({
      to: email,
      subject: `Welcome to ${name} on SGS Core`,
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
          <h1 style="margin:0 0 8px;font-size:22px;color:#702B9E;">Welcome, ${firstName}!</h1>
          <p style="margin:0 0 16px;color:#555;">Your organization <strong>${name}</strong> has been set up and is ready to go.</p>
          <p style="margin:0 0 24px;color:#555;">You've been assigned as the organization admin. Click the button below to sign in and get started.</p>
          ${magicLink ? `<p style="text-align:center;margin:24px 0;"><a href="${magicLink}" style="display:inline-block;padding:12px 32px;background:#702B9E;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Sign In to SGS Core</a></p>` : `<p style="margin:0 0 16px;color:#555;">Visit <strong>app.sgscore.com</strong> and sign in with this email address to get started.</p>`}
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
    // Don't fail the whole operation if the welcome email fails
    console.error("Failed to send welcome email:", emailErr);
  }

  redirect(`/admin/orgs/${org.id}`);
}
