import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Analytics</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Key metrics, charts, and reporting will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
