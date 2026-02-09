import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getControlPlaneClient, getSgsStaffByIdentity } from "@sgscore/api";
import type { IdentityOrgLink, Organization } from "@sgscore/types";
import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import Link from "next/link";
import { Shield } from "lucide-react";

export default async function OrgPickerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cp = getControlPlaneClient();
  const [{ data: links }, staff] = await Promise.all([
    cp
      .from("identity_org_links")
      .select("*, organization:organizations(*)")
      .eq("global_identity_id", user.id)
      .eq("status", "active"),
    getSgsStaffByIdentity(user.id),
  ]);

  const orgLinks = (links ?? []) as (IdentityOrgLink & {
    organization: Organization;
  })[];

  if (orgLinks.length === 0 && !staff) {
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

  if (orgLinks.length === 1 && !staff) {
    redirect(`/org/${orgLinks[0].organization.slug}/tickets`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff && (
            <Link
              href="/admin/orgs"
              className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
            >
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Admin Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Platform administration
                </p>
              </div>
            </Link>
          )}
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
