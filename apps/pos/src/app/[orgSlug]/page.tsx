import { Button, Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import Link from "next/link";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-heading font-bold">Welcome</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Explore what we have to offer
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Purchase admission tickets for your visit.
            </p>
            <Link href={`/${orgSlug}/tickets`}>
              <Button className="w-full">Browse Tickets</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Discover upcoming events and book your spot.
            </p>
            <Link href={`/${orgSlug}/events`}>
              <Button className="w-full" variant="outline">Browse Events</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memberships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Become a member and enjoy exclusive benefits.
            </p>
            <Link href={`/${orgSlug}/memberships`}>
              <Button className="w-full" variant="outline">View Plans</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
