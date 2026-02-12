import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import Link from "next/link";
import { Ticket, Calendar, Users, Heart } from "lucide-react";
import type { PosNavItem, DonationPageConfig } from "@sgscore/types";
import { DEFAULT_POS_NAV, DEFAULT_DONATION_PAGE_CONFIG } from "@sgscore/types";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const posNavigation =
    (settings.posNavigation as PosNavItem[] | undefined) ?? DEFAULT_POS_NAV;
  const donationConfig: DonationPageConfig = {
    ...DEFAULT_DONATION_PAGE_CONFIG,
    ...(settings.donationPage as Partial<DonationPageConfig> | undefined),
  };

  const tenant = getTenantClient(org);

  const [ticketRes, cardRes] = await Promise.all([
    tenant
      .from("ticket_types")
      .select("id", { count: "exact" })
      .eq("status", "active"),
    tenant
      .from("membership_card_designs")
      .select("id", { count: "exact" })
      .eq("status", "active")
      .eq("pos_visible", true),
  ]);

  const ticketCount = ticketRes.count ?? 0;
  const cardCount = cardRes.count ?? 0;

  const visibleKeys = new Set(
    posNavigation.filter((n) => n.visible).map((n) => n.key),
  );

  const categories = [
    {
      key: "tickets",
      label: "Tickets",
      description:
        ticketCount > 0
          ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"} available`
          : "No tickets available yet",
      icon: Ticket,
    },
    {
      key: "events",
      label: "Events",
      description: "Coming Soon",
      icon: Calendar,
    },
    {
      key: "memberships",
      label: "Memberships",
      description:
        cardCount > 0
          ? `${cardCount} membership${cardCount === 1 ? "" : "s"} available`
          : "No memberships available yet",
      icon: Users,
    },
    {
      key: "donations",
      label: "Donations",
      description: donationConfig.enabled
        ? "Donations are open"
        : "Coming Soon",
      icon: Heart,
    },
  ];

  const visibleCategories = categories.filter((c) => visibleKeys.has(c.key));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Shop</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {visibleCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {cat.description}
                </p>
                <Link href={`/${orgSlug}/${cat.key}`}>
                  <Button className="w-full" variant="outline">
                    Browse {cat.label}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
