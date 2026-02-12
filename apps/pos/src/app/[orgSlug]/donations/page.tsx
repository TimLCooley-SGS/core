import { notFound } from "next/navigation";
import { getOrgBySlug } from "@sgscore/api";
import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import { Heart } from "lucide-react";
import type { DonationPageConfig } from "@sgscore/types";
import { DEFAULT_DONATION_PAGE_CONFIG } from "@sgscore/types";
import { DonationPageClient } from "./donation-client";

export default async function DonationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const saved = settings.donationPage as Partial<DonationPageConfig> | undefined;
  const config: DonationPageConfig = { ...DEFAULT_DONATION_PAGE_CONFIG, ...saved };

  if (!config.enabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-heading font-bold">Donations</h1>
        <Card>
          <CardHeader>
            <CardTitle>Make a Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                Online donations will be available here shortly. Thank you for
                your interest in supporting our mission.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Donations</h1>
      <DonationPageClient config={config} />
    </div>
  );
}
