import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function ConfirmationPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-heading font-bold">Thank You!</h1>
        <p className="mt-2 text-muted-foreground">
          Your purchase has been confirmed.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Post-purchase confirmation details will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
