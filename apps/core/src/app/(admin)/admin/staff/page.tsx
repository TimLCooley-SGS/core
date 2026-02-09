import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff Management</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage SGS platform staff members, roles, and permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
