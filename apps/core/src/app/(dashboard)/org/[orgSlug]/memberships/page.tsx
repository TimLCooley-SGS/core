import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function MembershipsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Memberships</h1>
      <Card>
        <CardHeader>
          <CardTitle>Membership Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Membership plan CRUD, seat management, and purchase flows will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
