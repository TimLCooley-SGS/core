"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@sgscore/ui";
import { Plus, Trash2 } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { Location, BlockedDate } from "@sgscore/types";
import {
  addLocation,
  deleteLocation,
  addBlockedDate,
  deleteBlockedDate,
} from "./actions";

interface LocationSettingsProps {
  orgSlug: string;
  locations: Location[];
  blockedDates: BlockedDate[];
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return formatDateDisplay(startDate);
  }
  const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
  const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
  const start = new Date(sYear, sMonth - 1, sDay);
  const end = new Date(eYear, eMonth - 1, eDay);

  if (start.getFullYear() === end.getFullYear()) {
    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }

  return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function LocationSettings({
  orgSlug,
  locations,
  blockedDates,
}: LocationSettingsProps) {
  const canEdit = useHasCapability("settings.update");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations & Blocked Dates</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="locations">
          <TabsList>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="blocked-dates">Blocked Dates</TabsTrigger>
          </TabsList>
          <TabsContent value="locations">
            <LocationsTab
              orgSlug={orgSlug}
              locations={locations}
              canEdit={canEdit}
            />
          </TabsContent>
          <TabsContent value="blocked-dates">
            <BlockedDatesTab
              orgSlug={orgSlug}
              locations={locations}
              blockedDates={blockedDates}
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function LocationsTab({
  orgSlug,
  locations,
  canEdit,
}: {
  orgSlug: string;
  locations: Location[];
  canEdit: boolean;
}) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addState, addAction, addPending] = useActionState(addLocation, {});
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteLocation,
    {},
  );

  useEffect(() => {
    if (addState.success) setAddDialogOpen(false);
  }, [addState.success]);

  return (
    <div className="space-y-4 pt-4">
      {canEdit && (
        <div className="flex justify-end">
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Location</DialogTitle>
                <DialogDescription>
                  Add a physical space within your organization.
                </DialogDescription>
              </DialogHeader>
              <form action={addAction} className="space-y-4">
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <div className="space-y-2">
                  <Label htmlFor="loc-name">Name</Label>
                  <Input
                    id="loc-name"
                    name="name"
                    placeholder="e.g. Ballroom"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc-capacity">Capacity (optional)</Label>
                  <Input
                    id="loc-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    placeholder="e.g. 200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc-description">
                    Description (optional)
                  </Label>
                  <Input
                    id="loc-description"
                    name="description"
                    placeholder="e.g. Main event hall, second floor"
                  />
                </div>
                {addState.error && (
                  <p className="text-sm text-destructive">{addState.error}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addPending}>
                    {addPending ? "Adding..." : "Add Location"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {deleteState.error && (
        <p className="text-sm text-destructive">{deleteState.error}</p>
      )}
      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No locations added yet.
        </p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Capacity</th>
                <th className="px-4 py-3 text-left font-medium">
                  Description
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{loc.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.capacity ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {loc.description ?? "—"}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <form action={deleteAction}>
                        <input
                          type="hidden"
                          name="orgSlug"
                          value={orgSlug}
                        />
                        <input
                          type="hidden"
                          name="locationId"
                          value={loc.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={deletePending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BlockedDatesTab({
  orgSlug,
  locations,
  blockedDates,
  canEdit,
}: {
  orgSlug: string;
  locations: Location[];
  blockedDates: BlockedDate[];
  canEdit: boolean;
}) {
  const [timeFilter, setTimeFilter] = useState<"current" | "past">("current");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addState, addAction, addPending] = useActionState(addBlockedDate, {});
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteBlockedDate,
    {},
  );

  useEffect(() => {
    if (addState.success) setAddDialogOpen(false);
  }, [addState.success]);

  const locationMap = new Map(locations.map((l) => [l.id, l.name]));
  const today = todayStr();

  const currentDates = blockedDates.filter((bd) => bd.end_date >= today);
  const pastDates = blockedDates.filter((bd) => bd.end_date < today);
  const filtered = timeFilter === "current" ? currentDates : pastDates;

  function scopeLabel(locationId: string | null): string {
    if (!locationId) return "All locations";
    return locationMap.get(locationId) ?? "Unknown location";
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          <button
            type="button"
            onClick={() => setTimeFilter("current")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              timeFilter === "current"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Current ({currentDates.length})
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter("past")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              timeFilter === "past"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Past ({pastDates.length})
          </button>
        </div>
        {canEdit && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Blocked Date
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Blocked Date</DialogTitle>
                <DialogDescription>
                  Block dates on the calendar for all locations or a specific
                  one.
                </DialogDescription>
              </DialogHeader>
              <form action={addAction} className="space-y-4">
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <div className="space-y-2">
                  <Label htmlFor="bd-location">Location</Label>
                  <select
                    id="bd-location"
                    name="locationId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All locations</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bd-start">Start Date</Label>
                    <Input
                      id="bd-start"
                      name="startDate"
                      type="date"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bd-end">End Date</Label>
                    <Input
                      id="bd-end"
                      name="endDate"
                      type="date"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bd-reason">Reason</Label>
                  <Input
                    id="bd-reason"
                    name="reason"
                    placeholder="e.g. Building maintenance"
                    required
                  />
                </div>
                {addState.error && (
                  <p className="text-sm text-destructive">{addState.error}</p>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addPending}>
                    {addPending ? "Adding..." : "Add Blocked Date"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {deleteState.error && (
        <p className="text-sm text-destructive">{deleteState.error}</p>
      )}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {timeFilter === "current"
            ? "No current or upcoming blocked dates."
            : "No past blocked dates."}
        </p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Scope</th>
                <th className="px-4 py-3 text-left font-medium">Dates</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                {canEdit && (
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bd) => (
                <tr key={bd.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {scopeLabel(bd.location_id)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateRange(bd.start_date, bd.end_date)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bd.reason}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <form action={deleteAction}>
                        <input
                          type="hidden"
                          name="orgSlug"
                          value={orgSlug}
                        />
                        <input
                          type="hidden"
                          name="blockedDateId"
                          value={bd.id}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={deletePending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
