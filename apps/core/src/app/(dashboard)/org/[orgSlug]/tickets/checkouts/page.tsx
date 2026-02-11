import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

const steps = [
  { number: 1, title: "Select Tickets", description: "Choose ticket types and quantities" },
  { number: 2, title: "Attendee Info", description: "Collect names and contact details" },
  { number: 3, title: "Payment", description: "Process payment via Stripe" },
  { number: 4, title: "Confirmation", description: "Display receipt and send email" },
];

export default function CheckoutsDesignerPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Checkouts Designer</h2>

      <Card>
        <CardHeader>
          <CardTitle>Checkouts Designer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Customize the checkout experience for ticket purchases.
          </p>

          {/* Mock checkout flow preview */}
          <div className="rounded-lg border-2 border-dashed p-6">
            <div className="mx-auto max-w-lg space-y-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex items-start gap-4 rounded-lg border bg-card p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
