import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Tickets</h1>
      <Card>
        <CardHeader>
          <CardTitle>Ticket Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Ticket sales, scanning, and reporting will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
