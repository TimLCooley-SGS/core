import { Button, Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import Link from "next/link";
import { getOrgBySlug } from "@sgscore/api";
import { notFound } from "next/navigation";
import type { PosNavItem } from "@sgscore/types";
import { DEFAULT_POS_NAV } from "@sgscore/types";

const NAV_DESCRIPTIONS: Record<string, string> = {
  shop: "Browse our shop for tickets, memberships, and more.",
  tickets: "Purchase admission tickets for your visit.",
  events: "Discover upcoming events and book your spot.",
  memberships: "Become a member and enjoy exclusive benefits.",
  donations: "Support our mission with a donation.",
  portal: "Access your member portal and manage your account.",
};

export default async function StorefrontPage({
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

  const visibleCards = posNavigation
    .filter((n) => n.visible && n.key !== "home")
    .sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-heading font-bold">
          Welcome to {org.name}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Explore what we have to offer
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((item) => (
          <Card key={item.key}>
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {NAV_DESCRIPTIONS[item.key] ??
                  `Explore ${item.label.toLowerCase()}.`}
              </p>
              <Link href={`/${orgSlug}/${item.key}`}>
                <Button className="w-full" variant="outline">
                  Browse {item.label}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
