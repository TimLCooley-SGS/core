import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Branding editor, role/capability management, and staff management will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
