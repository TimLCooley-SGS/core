"use client";

import { useState, useActionState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import {
  updateOrgStatus,
  deleteStep_SupabaseProject,
  deleteStep_OrgLinks,
  deleteStep_Sessions,
  deleteStep_OrgRecord,
  deleteStep_AuditLog,
} from "./actions";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import type { OrgStatus } from "@sgscore/types";

type StepStatus = "pending" | "running" | "done" | "error";

interface DeleteStep {
  label: string;
  status: StepStatus;
  error?: string;
}

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

const INITIAL_STEPS: DeleteStep[] = [
  { label: "Removing Supabase project...", status: "pending" },
  { label: "Removing member links...", status: "pending" },
  { label: "Removing session data...", status: "pending" },
  { label: "Removing organization record...", status: "pending" },
  { label: "Writing audit log...", status: "pending" },
];

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "pending":
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

export function OrgActions({
  orgId,
  orgName,
  orgSlug,
  currentStatus,
}: {
  orgId: string;
  orgName: string;
  orgSlug: string;
  currentStatus: OrgStatus;
}) {
  const router = useRouter();
  const [statusState, statusAction, isStatusPending] = useActionState(updateOrgStatus, {});
  const [confirmName, setConfirmName] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [steps, setSteps] = useState<DeleteStep[]>(INITIAL_STEPS);
  const [deleteComplete, setDeleteComplete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const available = transitions[currentStatus];
  const isNoActions = available.length === 0 && currentStatus === "archived";

  const updateStep = (index: number, update: Partial<DeleteStep>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...update } : s)),
    );
  };

  const runDelete = useCallback(async () => {
    setConfirmDialogOpen(false);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setDeleteComplete(false);
    setDeleteFailed(false);
    setProgressDialogOpen(true);

    const stepActions = [
      () => deleteStep_SupabaseProject(orgId),
      () => deleteStep_OrgLinks(orgId),
      () => deleteStep_Sessions(orgId),
      () => deleteStep_OrgRecord(orgId),
      () => deleteStep_AuditLog(orgId, orgName, orgSlug),
    ];

    for (let i = 0; i < stepActions.length; i++) {
      updateStep(i, { status: "running" });
      try {
        const result = await stepActions[i]();
        if (!result.ok) {
          updateStep(i, { status: "error", error: result.error });
          setDeleteFailed(true);
          return;
        }
        updateStep(i, { status: "done" });
      } catch {
        updateStep(i, { status: "error", error: "Unexpected error" });
        setDeleteFailed(true);
        return;
      }
    }

    setDeleteComplete(true);
  }, [orgId, orgName, orgSlug]);

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

        {/* Confirmation dialog */}
        <Dialog
          open={confirmDialogOpen}
          onOpenChange={(open) => {
            setConfirmDialogOpen(open);
            if (!open) setConfirmName("");
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">Delete Organization</Button>
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
              <Button
                variant="destructive"
                disabled={confirmName !== orgName}
                onClick={runDelete}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress dialog */}
        <Dialog open={progressDialogOpen}>
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => {
              if (!deleteComplete && !deleteFailed) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {deleteComplete
                  ? "Organization Deleted"
                  : deleteFailed
                    ? "Delete Failed"
                    : "Deleting Organization..."}
              </DialogTitle>
              <DialogDescription>
                {deleteComplete
                  ? `${orgName} has been permanently removed.`
                  : deleteFailed
                    ? "An error occurred during deletion."
                    : `Removing ${orgName} and all associated data...`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <span
                    className={`text-sm ${
                      step.status === "done"
                        ? "text-green-700"
                        : step.status === "error"
                          ? "text-destructive"
                          : step.status === "running"
                            ? "text-foreground"
                            : "text-muted-foreground"
                    }`}
                  >
                    {step.status === "done"
                      ? step.label.replace("...", " — done")
                      : step.status === "error"
                        ? `${step.label.replace("...", "")} — failed${step.error ? `: ${step.error}` : ""}`
                        : step.label}
                  </span>
                </div>
              ))}
            </div>

            {(deleteComplete || deleteFailed) && (
              <DialogFooter>
                {deleteComplete ? (
                  <Button onClick={() => router.push("/admin/orgs")}>
                    Back to Organizations
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setProgressDialogOpen(false)}
                  >
                    Close
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
