import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Contacts</h1>
      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            People list, detail views, create/edit, and merge UI will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
