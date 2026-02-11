"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@sgscore/ui";
import { Pencil } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { ContactPerson } from "./page";
import { bulkUpdateStatus } from "./actions";

interface ContactsListProps {
  orgSlug: string;
  persons: ContactPerson[];
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ContactsList({ orgSlug, persons }: ContactsListProps) {
  const canUpdate = useHasCapability("people.update");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("keep");

  const [state, formAction, pending] = useActionState(bulkUpdateStatus, {});

  useEffect(() => {
    if (state.success) {
      setSelected(new Set());
      setSheetOpen(false);
      setBulkStatus("keep");
    }
  }, [state.success]);

  const allSelected = persons.length > 0 && selected.size === persons.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(persons.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bulk action bar */}
        {selected.size > 0 && canUpdate && (
          <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBulkStatus("keep");
                setSheetOpen(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Bulk Edit
            </Button>
          </div>
        )}

        {/* Table */}
        {persons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No contacts yet.
          </p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {canUpdate && (
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">DOB</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((person) => (
                  <tr key={person.id} className="border-b last:border-0">
                    {canUpdate && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected.has(person.id)}
                          onCheckedChange={() => toggleOne(person.id)}
                          aria-label={`Select ${person.first_name} ${person.last_name}`}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/org/${orgSlug}/contacts/people/${person.id}`}
                        className="text-primary hover:underline"
                      >
                        {person.last_name}, {person.first_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {person.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {person.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={statusColors[person.status]}
                      >
                        {person.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(person.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(person.date_of_birth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bulk Edit Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Bulk Edit</SheetTitle>
              <SheetDescription>
                Update {selected.size} person(s).
              </SheetDescription>
            </SheetHeader>
            <form action={formAction} className="flex flex-1 flex-col gap-4">
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input
                type="hidden"
                name="personIds"
                value={Array.from(selected).join(",")}
              />
              <div className="space-y-2">
                <Label htmlFor="bulk-status">Status</Label>
                <select
                  id="bulk-status"
                  name="status"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="keep">Keep current value</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <SheetFooter>
                <Button
                  type="submit"
                  disabled={bulkStatus === "keep" || pending}
                >
                  {pending
                    ? "Updating..."
                    : `Update ${selected.size} person(s)`}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}
