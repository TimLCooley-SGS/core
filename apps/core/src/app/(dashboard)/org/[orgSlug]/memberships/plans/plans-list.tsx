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
} from "@sgscore/ui";
import { Plus, Pencil, Archive, RotateCcw } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { MembershipPlan } from "@sgscore/types/tenant";
import { archiveMembershipPlan, activateMembershipPlan } from "./actions";

interface PlansListProps {
  orgSlug: string;
  plans: MembershipPlan[];
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDuration(days: number): string {
  if (days === 365) return "1 Year";
  if (days === 730) return "2 Years";
  if (days === 30) return "Monthly";
  if (days === 90) return "Quarterly";
  if (days === 180) return "6 Months";
  return `${days} days`;
}

export function PlansList({ orgSlug, plans }: PlansListProps) {
  const canManage = useHasCapability("memberships.manage");

  // Archive dialog
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveMembershipPlan,
    {},
  );

  // Activate
  const [activateState, activateAction, activatePending] = useActionState(
    activateMembershipPlan,
    {},
  );

  useEffect(() => {
    if (archiveState.success) {
      setArchiveOpen(false);
      setArchiveTarget(null);
    }
  }, [archiveState.success]);

  function confirmArchive(planId: string) {
    setArchiveTarget(planId);
    setArchiveOpen(true);
  }

  function handleArchive() {
    if (!archiveTarget) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("planId", archiveTarget);
    archiveAction(fd);
  }

  function handleActivate(planId: string) {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("planId", planId);
    activateAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Membership Plans</h2>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/org/${orgSlug}/memberships/plans/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Link>
          </Button>
        )}
      </div>

      {activateState.error && (
        <p className="text-sm text-destructive">{activateState.error}</p>
      )}

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No membership plans yet.</p>
            {canManage && (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/org/${orgSlug}/memberships/plans/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Plan
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="group relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">
                      {plan.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Badge
                        variant={
                          plan.status === "active" ? "default" : "secondary"
                        }
                      >
                        {plan.status.charAt(0).toUpperCase() +
                          plan.status.slice(1)}
                      </Badge>
                      {plan.is_recurring && (
                        <Badge variant="secondary">Recurring</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatPrice(plan.price_cents)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatDuration(plan.duration_days)}</span>
                  <span>
                    {plan.seat_count === 1
                      ? "Individual"
                      : `${plan.seat_count} seats`}
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/org/${orgSlug}/memberships/plans/${plan.id}`}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                    {plan.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => confirmArchive(plan.id)}
                      >
                        <Archive className="mr-1 h-3 w-3" />
                        Archive
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activatePending}
                        onClick={() => handleActivate(plan.id)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Activate
                      </Button>
                    )}
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
            <DialogTitle>Archive Plan</DialogTitle>
            <DialogDescription>
              This membership plan will be archived and no longer available for
              purchase. Existing memberships on this plan will not be affected.
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
              {archivePending ? "Archiving..." : "Archive Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
