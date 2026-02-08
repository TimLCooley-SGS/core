import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function KioskCheckoutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-heading font-bold text-center">Checkout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Touch-optimized Stripe payment for kiosk mode will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
