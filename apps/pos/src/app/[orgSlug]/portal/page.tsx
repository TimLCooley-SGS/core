import { notFound } from "next/navigation";
import { getOrgBySlug } from "@sgscore/api";
import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import { Users } from "lucide-react";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Member Portal</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your Membership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Members will be able to view their membership details, manage
              seats, and access exclusive content here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
