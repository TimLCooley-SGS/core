import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@sgscore/ui";

interface MockTicket {
  id: string;
  name: string;
  price: number;
  status: "active" | "draft" | "sold-out";
  sold: number;
  available: number;
}

const tickets: MockTicket[] = [
  {
    id: "1",
    name: "General Admission",
    price: 15,
    status: "active",
    sold: 342,
    available: 658,
  },
  {
    id: "2",
    name: "VIP Pass",
    price: 75,
    status: "active",
    sold: 48,
    available: 52,
  },
  {
    id: "3",
    name: "Day Pass",
    price: 25,
    status: "draft",
    sold: 0,
    available: 500,
  },
  {
    id: "4",
    name: "Season Pass",
    price: 120,
    status: "active",
    sold: 89,
    available: 111,
  },
  {
    id: "5",
    name: "Group Admission",
    price: 50,
    status: "sold-out",
    sold: 200,
    available: 0,
  },
];

const statusVariant: Record<MockTicket["status"], "default" | "secondary" | "destructive"> = {
  active: "default",
  draft: "secondary",
  "sold-out": "destructive",
};

const statusLabel: Record<MockTicket["status"], string> = {
  active: "Active",
  draft: "Draft",
  "sold-out": "Sold Out",
};

export default function TicketsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tickets</h2>
        <Button size="sm">Add Ticket</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {ticket.name}
              </CardTitle>
              <Badge variant={statusVariant[ticket.status]}>
                {statusLabel[ticket.status]}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${ticket.price.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {ticket.sold} sold &middot; {ticket.available} available
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
