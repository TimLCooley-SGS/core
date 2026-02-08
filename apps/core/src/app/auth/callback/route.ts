import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient } from "@sgscore/api";
import type { IdentityOrgLink, Organization } from "@sgscore/types";

export async function GET(request: Request) {
  try {
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
              `${origin}/org/${orgLinks[0].organization.slug}/tickets`,
            );
          }

          // Multiple orgs or no orgs — go to org picker
          return NextResponse.redirect(`${origin}/org-picker`);
        }
      }
    }

    // Auth failed — redirect to login
    return NextResponse.redirect(`${origin}/login`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    return NextResponse.json(
      { error: message, stack },
      { status: 500 },
    );
  }
}
