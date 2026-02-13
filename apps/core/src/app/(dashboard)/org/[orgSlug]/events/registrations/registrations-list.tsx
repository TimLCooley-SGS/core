"use client";

import { useState, useActionState } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
} from "@sgscore/ui";
import { CheckCircle2, Circle, Undo2, Printer } from "lucide-react";
import { checkInPerson, undoCheckIn } from "../list/actions";

interface RegistrationsListProps {
  orgSlug: string;
  events: { id: string; name: string; status: string }[];
  registrations: Record<string, unknown>[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  confirmed: "default",
  waitlisted: "secondary",
  cancelled: "destructive",
  pending_payment: "secondary",
};

export function RegistrationsList({
  orgSlug,
  events,
  registrations,
}: RegistrationsListProps) {
  const [filterEventId, setFilterEventId] = useState("");
  const [checkInState, checkInAction, checkInPending] = useActionState(checkInPerson, {});
  const [undoState, undoAction, undoPending] = useActionState(undoCheckIn, {});

  const filtered = filterEventId
    ? registrations.filter((r) => {
        const evt = r.events as { id: string } | null;
        return evt?.id === filterEventId;
      })
    : registrations;

  const checkedInCount = filtered.filter((r) => r.checked_in_at).length;

  function handleCheckIn(registrationId: string) {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("registrationId", registrationId);
    checkInAction(fd);
  }

  function handleUndoCheckIn(registrationId: string) {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("registrationId", registrationId);
    undoAction(fd);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Registrations</h2>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Check-in Sheet
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={filterEventId}
          onChange={(e) => setFilterEventId(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">All Events</option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.name}
            </option>
          ))}
        </select>
        {filtered.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {checkedInCount} / {filtered.length} checked in
          </span>
        )}
      </div>

      {checkInState.error && (
        <p className="text-sm text-destructive">{checkInState.error}</p>
      )}
      {undoState.error && (
        <p className="text-sm text-destructive">{undoState.error}</p>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No registrations found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Person</th>
                <th className="text-left px-4 py-2 font-medium">Event</th>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Check-in</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((reg) => {
                const person = reg.persons as {
                  first_name: string;
                  last_name: string;
                  email: string;
                } | null;
                const event = reg.events as { name: string } | null;
                const schedule = reg.event_schedules as { date: string } | null;
                const isCheckedIn = !!reg.checked_in_at;

                return (
                  <tr key={reg.id as string} className="border-t">
                    <td className="px-4 py-2">
                      <p className="font-medium">
                        {person?.first_name} {person?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {person?.email}
                      </p>
                    </td>
                    <td className="px-4 py-2">{event?.name ?? "—"}</td>
                    <td className="px-4 py-2">{schedule?.date ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant[reg.status as string] ?? "secondary"}>
                        {(reg.status as string).replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {isCheckedIn ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs">Checked in</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Circle className="h-4 w-4" />
                          <span className="text-xs">Not checked in</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isCheckedIn ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={undoPending}
                          onClick={() => handleUndoCheckIn(reg.id as string)}
                        >
                          <Undo2 className="mr-1 h-3 w-3" />
                          Undo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={checkInPending || reg.status === "cancelled"}
                          onClick={() => handleCheckIn(reg.id as string)}
                        >
                          Check In
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
