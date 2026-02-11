"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@sgscore/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PortalAnnouncement } from "@sgscore/types/tenant";
import { AnnouncementForm } from "./announcement-form";
import { archiveAnnouncement } from "./actions";

interface AnnouncementsTabProps {
  orgSlug: string;
  announcements: PortalAnnouncement[];
}

export function AnnouncementsTab({ orgSlug, announcements }: AnnouncementsTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PortalAnnouncement | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveAnnouncement,
    {},
  );

  useEffect(() => {
    if (archiveState.success) {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [archiveState.success]);

  function openCreate() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(a: PortalAnnouncement) {
    setEditTarget(a);
    setFormOpen(true);
  }

  function confirmArchive(id: string) {
    setDeleteTarget(id);
    setDeleteOpen(true);
  }

  function handleArchive() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("announcementId", deleteTarget);
    archiveAction(fd);
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Announcements</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No announcements yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{a.title}</span>
                    <Badge
                      variant={a.status === "published" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {a.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.starts_at)} — {formatDate(a.ends_at)}
                  </p>
                  {a.content_html && (
                    <div
                      className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: a.content_html }}
                    />
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(a)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => confirmArchive(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <AnnouncementForm
        orgSlug={orgSlug}
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editTarget}
      />

      {/* Archive confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Announcement</DialogTitle>
            <DialogDescription>
              This announcement will be archived and hidden from the portal.
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
              {archivePending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
