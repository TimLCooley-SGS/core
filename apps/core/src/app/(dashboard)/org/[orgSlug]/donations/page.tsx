import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function DonationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Donations</h1>
      <Card>
        <CardHeader>
          <CardTitle>Donation Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Donation recording, campaigns, and Stripe integration will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
