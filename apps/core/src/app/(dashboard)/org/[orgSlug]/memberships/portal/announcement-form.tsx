"use client";

import { useState, useEffect, useActionState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Input,
  Label,
} from "@sgscore/ui";
import type { PortalAnnouncement } from "@sgscore/types/tenant";
import { TiptapEditor } from "./tiptap-editor";
import { createAnnouncement, updateAnnouncement } from "./actions";

interface AnnouncementFormProps {
  orgSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: PortalAnnouncement;
}

export function AnnouncementForm({
  orgSlug,
  open,
  onOpenChange,
  announcement,
}: AnnouncementFormProps) {
  const isEdit = !!announcement;
  const action = isEdit ? updateAnnouncement : createAnnouncement;
  const [state, formAction, pending] = useActionState(action, {});

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [contentHtml, setContentHtml] = useState(announcement?.content_html ?? "");
  const [status, setStatus] = useState(announcement?.status ?? "draft");
  const [startsAt, setStartsAt] = useState(
    announcement?.starts_at?.slice(0, 16) ?? "",
  );
  const [endsAt, setEndsAt] = useState(
    announcement?.ends_at?.slice(0, 16) ?? "",
  );

  // Reset form when announcement changes
  useEffect(() => {
    setTitle(announcement?.title ?? "");
    setContentHtml(announcement?.content_html ?? "");
    setStatus(announcement?.status ?? "draft");
    setStartsAt(announcement?.starts_at?.slice(0, 16) ?? "");
    setEndsAt(announcement?.ends_at?.slice(0, 16) ?? "");
  }, [announcement]);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (announcement) fd.append("announcementId", announcement.id);
    fd.append("title", title);
    fd.append("contentHtml", contentHtml);
    fd.append("status", status);
    if (startsAt) fd.append("startsAt", new Date(startsAt).toISOString());
    if (endsAt) fd.append("endsAt", new Date(endsAt).toISOString());
    formAction(fd);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Announcement" : "New Announcement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="annTitle">Title *</Label>
            <Input
              id="annTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <TiptapEditor
              content={contentHtml}
              onChange={setContentHtml}
              placeholder="Write your announcement..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Date</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={status === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus("draft")}
              >
                Draft
              </Button>
              <Button
                type="button"
                variant={status === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus("published")}
              >
                Published
              </Button>
            </div>
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={pending || !title.trim()}
            onClick={handleSave}
          >
            {pending ? "Saving..." : isEdit ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
