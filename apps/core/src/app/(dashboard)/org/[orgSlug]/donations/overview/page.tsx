import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function DonationsOverviewPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Donation Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Donation recording, campaigns, and analytics will be built here.
        </p>
      </CardContent>
    </Card>
  );
}
