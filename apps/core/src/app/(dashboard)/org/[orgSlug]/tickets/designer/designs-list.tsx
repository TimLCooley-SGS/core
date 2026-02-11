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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@sgscore/ui";
import { Plus, MoreHorizontal, Pencil, Archive } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { TicketDesign } from "@sgscore/types/tenant";
import { deleteTicketDesign } from "./actions";

interface DesignsListProps {
  orgSlug: string;
  designs: TicketDesign[];
}

export function DesignsList({ orgSlug, designs }: DesignsListProps) {
  const canManage = useHasCapability("tickets.manage");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(deleteTicketDesign, {});

  useEffect(() => {
    if (state.success) {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [state.success]);

  function confirmDelete(designId: string) {
    setDeleteTarget(designId);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("designId", deleteTarget);
    formAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ticket Designs</h2>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/tickets/designer/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Design
            </Link>
          </Button>
        )}
      </div>

      {designs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No ticket designs yet.
            </p>
            {canManage && (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/org/${orgSlug}/tickets/designer/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Design
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((design) => (
            <Card key={design.id} className="group relative overflow-hidden">
              {/* Ticket thumbnail */}
              <Link href={`/org/${orgSlug}/tickets/designer/${design.id}`}>
                <div
                  className="w-full rounded-t-lg border-b"
                  style={{
                    aspectRatio: "16 / 9",
                    backgroundColor: design.background_color,
                  }}
                >
                  <div className="h-full flex items-center justify-center p-4">
                    <div className="space-y-1 text-center">
                      <div className="flex items-end justify-center gap-px h-8 mb-2">
                        {[3,1,2,3,1,2,1,3,2,1,3,2].map((w, i) => (
                          <div
                            key={i}
                            style={{
                              width: w * 1.5,
                              height: "100%",
                              backgroundColor: design.font_color,
                              opacity: i % 3 === 0 ? 1 : 0.6,
                            }}
                          />
                        ))}
                      </div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: design.font_color }}
                      >
                        {design.name}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/org/${orgSlug}/tickets/designer/${design.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {design.name}
                  </Link>
                  <div className="flex gap-1 mt-1">
                    {design.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/org/${orgSlug}/tickets/designer/${design.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => confirmDelete(design.id)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Archive confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Ticket Design</DialogTitle>
            <DialogDescription>
              This ticket design will be archived and no longer available for use.
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
              onClick={handleDelete}
            >
              {pending ? "Archiving..." : "Archive Design"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
