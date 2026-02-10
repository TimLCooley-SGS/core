import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function ListsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lists</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Saved segments and smart lists will be built here.
        </p>
      </CardContent>
    </Card>
  );
}
