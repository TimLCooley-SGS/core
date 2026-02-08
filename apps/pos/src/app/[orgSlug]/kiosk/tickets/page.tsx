import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function KioskTicketsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-heading font-bold text-center">Select Tickets</h1>
      <Card>
        <CardHeader>
          <CardTitle>Available Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Touch-optimized ticket selection for kiosk mode will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
