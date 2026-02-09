"use client";

import { useActionState } from "react";
import { Button } from "@sgscore/ui";
import { updateOrgStatus } from "./actions";
import type { OrgStatus } from "@sgscore/types";

const transitions: Record<OrgStatus, { label: string; status: OrgStatus; variant: "default" | "destructive" | "outline" }[]> = {
  provisioning: [
    { label: "Activate", status: "active", variant: "default" },
  ],
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
  currentStatus,
}: {
  orgId: string;
  currentStatus: OrgStatus;
}) {
  const [state, formAction, isPending] = useActionState(updateOrgStatus, {});
  const available = transitions[currentStatus];

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This organization is archived. No actions available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-green-100 p-3 text-sm text-green-800">
          Status updated successfully.
        </div>
      )}
      <div className="flex gap-3">
        {available.map((action) => (
          <form key={action.status} action={formAction}>
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="status" value={action.status} />
            <Button
              type="submit"
              variant={action.variant}
              disabled={isPending}
            >
              {action.label}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
