import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";
import type { IdentityOrgLink, Organization } from "@sgscore/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Look up user's org links to determine redirect
        const cp = getControlPlaneClient();
        const { data: links } = await cp
          .from("identity_org_links")
          .select("*, organization:organizations(*)")
          .eq("global_identity_id", user.id)
          .eq("status", "active");

        const orgLinks = (links ?? []) as (IdentityOrgLink & {
          organization: Organization;
        })[];

        if (orgLinks.length === 1) {
          // Single org — go straight to dashboard
          return NextResponse.redirect(
            `${origin}/org/${orgLinks[0].organization.slug}`,
          );
        }

        if (orgLinks.length === 0) {
          // No orgs — check if they're platform staff
          const staff = await getSgsStaffByIdentity(user.id);
          if (staff) {
            return NextResponse.redirect(`${origin}/admin/orgs`);
          }
        }

        // Multiple orgs or no orgs (non-staff) — go to org picker
        return NextResponse.redirect(`${origin}/org-picker`);
      }
    }
  }

  // Auth failed — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
