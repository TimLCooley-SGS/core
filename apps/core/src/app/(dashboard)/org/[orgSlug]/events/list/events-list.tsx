"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenuSeparator,
} from "@sgscore/ui";
import { Plus, MoreVertical, Copy, Archive, Trash2, Pencil, Globe, GlobeLock } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { Event } from "@sgscore/types/tenant";
import {
  archiveEvent,
  deleteEvent,
  duplicateEvent,
  publishEvent,
} from "./actions";

interface EventsListProps {
  orgSlug: string;
  events: Event[];
}

const statusVariant: Record<string, "default" | "secondary"> = {
  active: "default",
  draft: "secondary",
};

const typeLabel: Record<string, string> = {
  single: "Single Day",
  multi_day: "Multi-Day",
  recurring: "Recurring",
};

export function EventsList({ orgSlug, events }: EventsListProps) {
  const canManage = useHasCapability("events.manage");
  const router = useRouter();

  // Archive dialog
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveEvent, {});

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteEvent, {});

  // Duplicate
  const [dupState, dupAction, dupPending] = useActionState(duplicateEvent, {});

  // Publish / Unpublish
  const [pubState, pubAction, pubPending] = useActionState(publishEvent, {});

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

  function confirmArchive(eventId: string) {
    setArchiveTarget(eventId);
    setArchiveOpen(true);
  }

  function handleArchive() {
    if (!archiveTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("eventId", archiveTarget);
    archiveAction(fd);
  }

  function confirmDelete(eventId: string) {
    setDeleteTarget(eventId);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("eventId", deleteTarget);
    deleteAction(fd);
  }

  function handleDuplicate(eventId: string) {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("eventId", eventId);
    dupAction(fd);
  }

  function handlePublishToggle(eventId: string) {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("eventId", eventId);
    pubAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Events</h2>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/events/list/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Link>
          </Button>
        )}
      </div>

      {dupState.error && (
        <p className="text-sm text-destructive">{dupState.error}</p>
      )}
      {pubState.error && (
        <p className="text-sm text-destructive">{pubState.error}</p>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No events yet.</p>
            {canManage && (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/org/${orgSlug}/events/list/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Event
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="group relative overflow-hidden">
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1 pr-2">
                  <Link
                    href={`/org/${orgSlug}/events/list/${event.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    <CardTitle className="text-base font-medium">
                      {event.name}
                    </CardTitle>
                  </Link>
                  <div className="flex gap-1">
                    <Badge variant={statusVariant[event.status] ?? "secondary"}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    <Badge variant="secondary">
                      {typeLabel[event.event_type] ?? event.event_type}
                    </Badge>
                    {event.is_free && (
                      <Badge variant="secondary">Free</Badge>
                    )}
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
                        onClick={() => router.push(`/org/${orgSlug}/events/list/${event.id}`)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePublishToggle(event.id)}
                        disabled={pubPending}
                      >
                        {event.status === "active" ? (
                          <>
                            <GlobeLock className="mr-2 h-4 w-4" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(event.id)}
                        disabled={dupPending}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmArchive(event.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => confirmDelete(event.id)}
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
                <p className="text-sm text-muted-foreground">
                  {event.description
                    ? event.description.length > 100
                      ? event.description.slice(0, 100) + "..."
                      : event.description
                    : "No description"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Archive confirmation */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Event</DialogTitle>
            <DialogDescription>
              This event will be archived and no longer visible in the list.
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
              {archivePending ? "Archiving..." : "Archive Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Draft events will be permanently deleted. Active events will be
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
              {deletePending ? "Deleting..." : "Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
