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
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@sgscore/ui";
import { Pencil, Plus, Search } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { ContactPerson } from "./page";
import { bulkUpdateStatus, createPerson } from "./actions";

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
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const [state, formAction, pending] = useActionState(bulkUpdateStatus, {});
  const [addState, addFormAction, addPending] = useActionState(createPerson, {});

  useEffect(() => {
    if (state.success) {
      setSelected(new Set());
      setSheetOpen(false);
      setBulkStatus("keep");
    }
  }, [state.success]);

  useEffect(() => {
    if (addState.success) {
      setAddOpen(false);
    }
  }, [addState.success]);

  const filtered = persons.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.phone?.toLowerCase().includes(q) ?? false) ||
      p.status.toLowerCase().includes(q) ||
      (p.date_of_birth?.toLowerCase().includes(q) ?? false) ||
      (p.created_at?.toLowerCase().includes(q) ?? false)
    );
  });

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
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
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Contacts</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          {canUpdate && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          )}
        </div>
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
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "No matching contacts." : "No contacts yet."}
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
                {filtered.map((person) => (
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
        {/* Add Contact Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription>
                Create a new contact record.
              </DialogDescription>
            </DialogHeader>
            <form action={addFormAction} className="space-y-4">
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div className="space-y-2">
                <Label htmlFor="add-firstName">First Name *</Label>
                <Input id="add-firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-lastName">Last Name</Label>
                <Input id="add-lastName" name="lastName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email *</Label>
                <Input id="add-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input id="add-phone" name="phone" type="tel" />
              </div>
              {addState.error && (
                <p className="text-sm text-destructive">{addState.error}</p>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={addPending}>
                  {addPending ? "Creating..." : "Create Contact"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
