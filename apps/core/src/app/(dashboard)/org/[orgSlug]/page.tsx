import { redirect } from "next/navigation";
import { getOrgBySlug } from "@sgscore/api";
import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default async function OrgIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) redirect("/org-picker");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to {org.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Dashboard coming soon.</p>
      </CardContent>
    </Card>
  );
}
