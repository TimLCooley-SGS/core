"use client";

import {
  Card,
  CardContent,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@sgscore/ui";
import type {
  PersonDetail,
  DonationRow,
  VisitRow,
  MembershipSeatRow,
  AuditLogRow,
} from "./page";

interface ContactTabsProps {
  person: PersonDetail;
  donations: DonationRow[];
  visits: VisitRow[];
  seats: MembershipSeatRow[];
  auditLog: AuditLogRow[];
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  pending_payment: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

const visitTypeColors: Record<string, string> = {
  service: "bg-blue-100 text-blue-800",
  event: "bg-purple-100 text-purple-800",
  class: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function describeAuditAction(entry: AuditLogRow): string {
  const action = entry.action;
  const table = entry.table_name;

  if (action === "create") return `Created ${table} record`;
  if (action === "update") {
    const fields = entry.new_values ? Object.keys(entry.new_values).join(", ") : "";
    return fields ? `Updated ${fields} on ${table}` : `Updated ${table} record`;
  }
  if (action === "delete") return `Deleted ${table} record`;
  return `${action} on ${table}`;
}

function computeLastActivity(
  visits: VisitRow[],
  donations: DonationRow[],
  auditLog: AuditLogRow[],
): string | null {
  const dates: string[] = [];
  if (visits.length > 0) dates.push(visits[0].visited_at);
  if (donations.length > 0) dates.push(donations[0].donation_date);
  if (auditLog.length > 0) dates.push(auditLog[0].created_at);

  if (dates.length === 0) return null;
  dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return dates[0];
}

export function ContactTabs({
  person,
  donations,
  visits,
  seats,
  auditLog,
}: ContactTabsProps) {
  const lastActivity = computeLastActivity(visits, donations, auditLog);
  const totalDonations = donations.reduce((sum, d) => sum + d.amount_cents, 0);
  const donationCurrency = donations.length > 0 ? donations[0].currency : "usd";

  return (
    <div className="space-y-6">
      {/* Data Highlights */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Created</p>
            <p className="text-sm font-medium">
              {formatDate(person.created_at)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge
              variant="secondary"
              className={statusColors[person.status] ?? ""}
            >
              {person.status}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">
              Last Activity
            </p>
            <p className="text-sm font-medium">
              {lastActivity ? formatDate(lastActivity) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            Overview ({auditLog.length})
          </TabsTrigger>
          <TabsTrigger value="activities">
            Activities ({visits.length})
          </TabsTrigger>
          <TabsTrigger value="donations">
            Donations ({donations.length})
          </TabsTrigger>
          <TabsTrigger value="memberships">
            Memberships ({seats.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {describeAuditAction(entry)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities">
          <Card>
            <CardContent className="pt-6">
              {visits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No visits recorded.
                </p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visits.map((visit) => (
                        <tr
                          key={visit.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className={
                                visitTypeColors[visit.visit_type] ?? ""
                              }
                            >
                              {visit.visit_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(visit.visited_at)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                            {visit.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Donations Tab */}
        <TabsContent value="donations">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {donations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No donations recorded.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-4 rounded-md border bg-muted/50 px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(totalDonations, donationCurrency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Count
                      </p>
                      <p className="text-lg font-semibold">
                        {donations.length}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            Campaign
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {donations.map((donation) => (
                          <tr
                            key={donation.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-4 py-3 font-medium">
                              {formatCurrency(
                                donation.amount_cents,
                                donation.currency,
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {donation.campaign ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatDate(donation.donation_date)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                              {donation.notes ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Memberships Tab */}
        <TabsContent value="memberships">
          <Card>
            <CardContent className="pt-6">
              {seats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No memberships found.
                </p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Starts
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Ends
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Price
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {seats.map((seat) => (
                        <tr
                          key={seat.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {seat.membership.plan.name}
                            <span className="text-muted-foreground ml-1">
                              (Seat {seat.seat_number})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className={
                                statusColors[seat.membership.status] ?? ""
                              }
                            >
                              {seat.membership.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(seat.membership.starts_at)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(seat.membership.ends_at)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatCurrency(
                              seat.membership.plan.price_cents,
                              seat.membership.plan.currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
