import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { Card, CardContent } from "@sgscore/ui";
import { Users } from "lucide-react";
import type { MembershipPlan } from "@sgscore/types/tenant";
import { MembershipsClient } from "./memberships-client";

export default async function MembershipsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const tenant = getTenantClient(org);

  const { data: plans } = await tenant
    .from("membership_plans")
    .select("*")
    .eq("status", "active")
    .order("price_cents");

  const activePlans = (plans ?? []) as MembershipPlan[];

  if (activePlans.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Memberships</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No Plans Available</p>
              <p className="text-sm text-muted-foreground">
                There are no membership plans available right now. Please check
                back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Memberships</h1>
      <MembershipsClient plans={activePlans} />
    </div>
  );
}
