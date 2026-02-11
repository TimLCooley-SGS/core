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
import { Plus, Trash2 } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { MembershipCardDesign } from "@sgscore/types/tenant";
import { deleteCardDesign } from "./actions";

interface CardsListProps {
  orgSlug: string;
  cards: MembershipCardDesign[];
}

export function CardsList({ orgSlug, cards }: CardsListProps) {
  const canManage = useHasCapability("memberships.manage");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(deleteCardDesign, {});

  useEffect(() => {
    if (state.success) {
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [state.success]);

  function confirmDelete(cardId: string) {
    setDeleteTarget(cardId);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("cardId", deleteTarget);
    formAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Card Designs</h2>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/memberships/cards/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Membership Card
            </Link>
          </Button>
        )}
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No membership card designs yet.
            </p>
            {canManage && (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/org/${orgSlug}/memberships/cards/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Card
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.id} className="group relative overflow-hidden">
              {/* Card thumbnail */}
              <Link href={`/org/${orgSlug}/memberships/cards/${card.id}`}>
                <div
                  className="w-full rounded-t-lg border-b"
                  style={{
                    aspectRatio: "3.375 / 2.125",
                    backgroundColor: card.background_color,
                  }}
                >
                  {card.front_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.front_image_url}
                      alt=""
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  )}
                  {!card.front_image_url && (
                    <div className="h-full flex items-center justify-center p-4">
                      <div className="space-y-1 text-center">
                        <div
                          className="h-1 w-8 rounded-full mx-auto mb-2"
                          style={{ backgroundColor: card.accent_color }}
                        />
                        <p
                          className="text-sm font-medium"
                          style={{ color: card.font_color }}
                        >
                          {card.name}
                        </p>
                        <p
                          className="text-xs opacity-50"
                          style={{ color: card.font_color }}
                        >
                          {card.front_fields.length} front /{" "}
                          {card.back_fields.length} back fields
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/org/${orgSlug}/memberships/cards/${card.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {card.name}
                  </Link>
                  <div className="flex gap-1 mt-1">
                    {card.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => confirmDelete(card.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Card Design</DialogTitle>
            <DialogDescription>
              This card design will be archived and no longer available for use.
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
              {pending ? "Archiving..." : "Archive Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
