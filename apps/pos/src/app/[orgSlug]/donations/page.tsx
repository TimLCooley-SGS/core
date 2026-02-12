import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";
import { Heart } from "lucide-react";

export default function DonationsPage() {
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
              Online donations will be available here shortly. Thank you for your
              interest in supporting our mission.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
