import { Card, CardContent, CardHeader, CardTitle } from "@sgscore/ui";

export default function TicketDesignerPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Ticket Designer</h2>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Designer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Design the look and feel of your printed and digital tickets.
          </p>

          {/* Mock ticket preview */}
          <div className="rounded-lg border-2 border-dashed p-6">
            <div className="mx-auto max-w-md rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Your Organization
                  </p>
                  <p className="mt-1 text-lg font-bold">General Admission</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">$15</p>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Date: Jan 15, 2026</span>
                  <span>Seat: GA</span>
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="h-12 w-36 rounded bg-muted" />
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Barcode placeholder
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
