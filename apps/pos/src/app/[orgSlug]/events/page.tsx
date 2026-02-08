import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Events</h1>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Event listing and booking will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
