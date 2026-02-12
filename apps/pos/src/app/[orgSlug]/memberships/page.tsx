import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { Card, CardContent } from "@sgscore/ui";
import { Users } from "lucide-react";
import type { MembershipCardDesign } from "@sgscore/types/tenant";
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

  const { data: cards } = await tenant
    .from("membership_card_designs")
    .select("*")
    .eq("status", "active")
    .eq("pos_visible", true)
    .order("price_cents");

  const activeCards = (cards ?? []) as MembershipCardDesign[];

  if (activeCards.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Memberships</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No Memberships Available</p>
              <p className="text-sm text-muted-foreground">
                There are no membership cards available right now. Please check
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
      <MembershipsClient cards={activeCards} />
    </div>
  );
}
