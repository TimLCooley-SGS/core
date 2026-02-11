"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
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
import { Plus, Trash2, FileText, Video, Music, FileDown, Code } from "lucide-react";
import type { PortalModule, PortalModuleType } from "@sgscore/types/tenant";
import { archiveModule } from "./actions";

const TYPE_ICONS: Record<PortalModuleType, React.ReactNode> = {
  text: <FileText className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  pdf: <FileText className="h-5 w-5" />,
  audio: <Music className="h-5 w-5" />,
  html: <Code className="h-5 w-5" />,
  file_download: <FileDown className="h-5 w-5" />,
};

const TYPE_LABELS: Record<PortalModuleType, string> = {
  text: "Text",
  video: "Video",
  pdf: "PDF",
  audio: "Audio",
  html: "HTML",
  file_download: "File",
};

interface GalleryTabProps {
  orgSlug: string;
  modules: PortalModule[];
}

export function GalleryTab({ orgSlug, modules }: GalleryTabProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(archiveModule, {});

  useEffect(() => {
    if (state.success) {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [state.success]);

  function confirmArchive(moduleId: string) {
    setDeleteTarget(moduleId);
    setDeleteOpen(true);
  }

  function handleArchive() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("moduleId", deleteTarget);
    formAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Content Modules</h3>
        <Button asChild size="sm">
          <Link href={`/org/${orgSlug}/memberships/portal/modules/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Link>
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No content modules yet. Add your first module to get started.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/org/${orgSlug}/memberships/portal/modules/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Module
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Card key={mod.id} className="group relative overflow-hidden">
              <Link href={`/org/${orgSlug}/memberships/portal/modules/${mod.id}`}>
                <div
                  className="w-full border-b bg-muted/30 flex items-center justify-center"
                  style={{ aspectRatio: "16 / 9" }}
                >
                  {mod.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mod.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground">
                      {TYPE_ICONS[mod.module_type]}
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <Link
                    href={`/org/${orgSlug}/memberships/portal/modules/${mod.id}`}
                    className="font-medium text-sm hover:underline block truncate"
                  >
                    {mod.title}
                  </Link>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[mod.module_type]}
                    </Badge>
                    <Badge
                      variant={mod.status === "published" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {mod.status}
                    </Badge>
                    {mod.sort_order > 0 && (
                      <span className="text-xs text-muted-foreground">
                        #{mod.sort_order}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => confirmArchive(mod.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Archive confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Module</DialogTitle>
            <DialogDescription>
              This module will be archived and hidden from the portal.
              This action can be reversed by an administrator.
            </DialogDescription>
          </DialogHeader>
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
              variant="destructive"
              disabled={pending}
              onClick={handleArchive}
            >
              {pending ? "Archiving..." : "Archive Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
