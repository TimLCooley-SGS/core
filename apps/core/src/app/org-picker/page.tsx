import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient } from "@sgscore/api";
import type { IdentityOrgLink, Organization } from "@sgscore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import Link from "next/link";

export default async function OrgPickerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cp = getControlPlaneClient();
  const { data: links } = await cp
    .from("identity_org_links")
    .select("*, organization:organizations(*)")
    .eq("global_identity_id", user.id)
    .eq("status", "active");

  const orgLinks = (links ?? []) as (IdentityOrgLink & {
    organization: Organization;
  })[];

  if (orgLinks.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have access to any organizations yet. Contact your
              administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orgLinks.length === 1) {
    redirect(`/org/${orgLinks[0].organization.slug}/tickets`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {orgLinks.map((link) => (
            <Link
              key={link.id}
              href={`/org/${link.organization.slug}/tickets`}
              className="block rounded-lg border p-4 transition-colors hover:bg-secondary"
            >
              <p className="font-medium">{link.organization.name}</p>
              <p className="text-sm text-muted-foreground">
                {link.organization.slug}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
