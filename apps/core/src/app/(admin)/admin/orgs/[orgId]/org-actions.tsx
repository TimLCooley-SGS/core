"use client";

import { useState, useActionState } from "react";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@sgscore/ui";
import { updateOrgStatus, deleteOrganization } from "./actions";
import type { OrgStatus } from "@sgscore/types";

const transitions: Record<
  OrgStatus,
  { label: string; status: OrgStatus; variant: "default" | "destructive" | "outline" }[]
> = {
  provisioning: [],
  active: [
    { label: "Suspend", status: "suspended", variant: "destructive" },
    { label: "Archive", status: "archived", variant: "outline" },
  ],
  suspended: [
    { label: "Activate", status: "active", variant: "default" },
    { label: "Archive", status: "archived", variant: "outline" },
  ],
  archived: [],
};

export function OrgActions({
  orgId,
  orgName,
  currentStatus,
}: {
  orgId: string;
  orgName: string;
  currentStatus: OrgStatus;
}) {
  const [statusState, statusAction, isStatusPending] = useActionState(updateOrgStatus, {});
  const [deleteState, deleteAction, isDeletePending] = useActionState(deleteOrganization, {});
  const [confirmName, setConfirmName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const available = transitions[currentStatus];

  const isNoActions = available.length === 0 && currentStatus === "archived";

  return (
    <div className="space-y-3">
      {statusState.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {statusState.error}
        </div>
      )}
      {statusState.success && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
          Status updated successfully.
        </div>
      )}
      {deleteState.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {deleteState.error}
        </div>
      )}

      {isNoActions && (
        <p className="text-sm text-muted-foreground">
          This organization is archived. No status actions available.
        </p>
      )}

      {currentStatus === "provisioning" && (
        <p className="text-sm text-muted-foreground">
          This organization is being provisioned. No actions available until provisioning completes.
        </p>
      )}

      <div className="flex gap-3">
        {available.map((action) => (
          <form key={action.status} action={statusAction}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="status" value={action.status} />
            <Button
              type="submit"
              variant={action.variant}
              disabled={isStatusPending}
            >
              {action.label}
            </Button>
          </form>
        ))}

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setConfirmName(""); }}>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={isDeletePending}>
              Delete Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Organization</DialogTitle>
              <DialogDescription>
                This will permanently delete <strong>{orgName}</strong>, its
                Supabase project, and all associated data. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="confirm-name">
                Type <strong>{orgName}</strong> to confirm
              </Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={orgName}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <form action={deleteAction}>
                <input type="hidden" name="orgId" value={orgId} />
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={confirmName !== orgName || isDeletePending}
                >
                  {isDeletePending ? "Deleting..." : "Delete"}
                </Button>
              </form>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
