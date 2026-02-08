import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function CheckoutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Checkout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Cart Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Cart summary and Stripe checkout integration will be built here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
