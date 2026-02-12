import { Button, Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import Link from "next/link";
import { Ticket, Calendar, Users, Heart } from "lucide-react";

const CATEGORIES = [
  {
    key: "tickets",
    label: "Tickets",
    description: "Purchase admission tickets for your visit.",
    icon: Ticket,
  },
  {
    key: "events",
    label: "Events",
    description: "Discover upcoming events and book your spot.",
    icon: Calendar,
  },
  {
    key: "memberships",
    label: "Memberships",
    description: "Become a member and enjoy exclusive benefits.",
    icon: Users,
  },
  {
    key: "donations",
    label: "Donations",
    description: "Support our mission with a donation.",
    icon: Heart,
  },
];

export default async function ShopPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Shop</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
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
