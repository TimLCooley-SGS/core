import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View all platform-level actions and changes across organizations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
