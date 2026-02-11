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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@sgscore/ui";
import { Plus, MoreVertical, Copy, Archive, Trash2 } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { TicketType } from "@sgscore/types/tenant";
import {
  archiveTicketType,
  deleteTicketType,
  duplicateTicketType,
} from "./actions";

interface TicketsListProps {
  orgSlug: string;
  tickets: TicketType[];
}

const statusVariant: Record<string, "default" | "secondary"> = {
  active: "default",
  draft: "secondary",
};

const modeLabel: Record<string, string> = {
  timed_entry: "Timed Entry",
  daily_admission: "Daily Admission",
};

export function TicketsList({ orgSlug, tickets }: TicketsListProps) {
  const canManage = useHasCapability("tickets.manage");

  // Archive dialog
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveTicketType, {});

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTicketType, {});

  // Duplicate
  const [dupState, dupAction, dupPending] = useActionState(duplicateTicketType, {});

  useEffect(() => {
    if (archiveState.success) {
      setArchiveOpen(false);
      setArchiveTarget(null);
    }
  }, [archiveState.success]);

  useEffect(() => {
    if (deleteState.success) {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteState.success]);

  function confirmArchive(ticketId: string) {
    setArchiveTarget(ticketId);
    setArchiveOpen(true);
  }

  function handleArchive() {
    if (!archiveTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", archiveTarget);
    archiveAction(fd);
  }

  function confirmDelete(ticketId: string) {
    setDeleteTarget(ticketId);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", deleteTarget);
    deleteAction(fd);
  }

  function handleDuplicate(ticketId: string) {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", ticketId);
    dupAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tickets</h2>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/tickets/list/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Ticket
            </Link>
          </Button>
        )}
      </div>

      {dupState.error && (
        <p className="text-sm text-destructive">{dupState.error}</p>
      )}

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No tickets yet.</p>
            {canManage && (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/org/${orgSlug}/tickets/list/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ticket
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="group relative overflow-hidden">
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1 pr-2">
                  <Link
                    href={`/org/${orgSlug}/tickets/list/${ticket.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    <CardTitle className="text-base font-medium">
                      {ticket.name}
                    </CardTitle>
                  </Link>
                  <div className="flex gap-1">
                    <Badge variant={statusVariant[ticket.status] ?? "secondary"}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </Badge>
                    <Badge variant="secondary">
                      {modeLabel[ticket.ticket_mode] ?? ticket.ticket_mode}
                    </Badge>
                  </div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={dupPending}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(ticket.id)}
                        disabled={dupPending}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmArchive(ticket.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => confirmDelete(ticket.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground capitalize">
                  {ticket.pricing_mode.replace("_", " ")} pricing
                </p>
                {ticket.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Archive confirmation */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Ticket</DialogTitle>
            <DialogDescription>
              This ticket will be archived and no longer visible in the list.
              This action can be reversed by an administrator.
            </DialogDescription>
          </DialogHeader>
          {archiveState.error && (
            <p className="text-sm text-destructive">{archiveState.error}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={archivePending}
              onClick={handleArchive}
            >
              {archivePending ? "Archiving..." : "Archive Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Draft tickets will be permanently deleted. Active tickets will be
              archived instead.
            </DialogDescription>
          </DialogHeader>
          {deleteState.error && (
            <p className="text-sm text-destructive">{deleteState.error}</p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={handleDelete}
            >
              {deletePending ? "Deleting..." : "Delete Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
