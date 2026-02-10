"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@sgscore/ui";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import {
  createStep_Setup,
  createStep_CreateProject,
  createStep_WaitForProject,
  createStep_ConfigureDb,
  createStep_SetupAdmin,
  createStep_Activate,
  createStep_SendWelcome,
  createStep_Cleanup,
} from "./actions";

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  label: string;
  status: StepStatus;
  error?: string;
}

const INITIAL_STEPS: Step[] = [
  { label: "Setting up user account...", status: "pending" },
  { label: "Creating Supabase project...", status: "pending" },
  { label: "Waiting for project to be ready...", status: "pending" },
  { label: "Configuring database...", status: "pending" },
  { label: "Setting up administrator...", status: "pending" },
  { label: "Activating organization...", status: "pending" },
  { label: "Sending welcome email...", status: "pending" },
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

export function CreateOrgForm() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const updateStep = (index: number, update: Partial<Step>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...update } : s)),
    );
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
      setIsComplete(false);
      setIsFailed(false);
      setCreatedOrgId(null);
      setFormError(null);
      setDialogOpen(true);

      // Step 0: Setup (user + org record)
      let orgId: string | null = null;
      updateStep(0, { status: "running" });
      try {
        const result = await createStep_Setup(formData);
        if (!result.ok) {
          updateStep(0, { status: "error", error: result.error });
          setIsFailed(true);
          return;
        }
        orgId = result.orgId!;
        setCreatedOrgId(orgId);
        updateStep(0, { status: "done" });
      } catch {
        updateStep(0, { status: "error", error: "Unexpected error" });
        setIsFailed(true);
        return;
      }

      // Steps 1-6: Provisioning pipeline
      const stepActions = [
        () => createStep_CreateProject(orgId!),
        () => createStep_WaitForProject(orgId!),
        () => createStep_ConfigureDb(orgId!),
        () => createStep_SetupAdmin(orgId!),
        () => createStep_Activate(orgId!),
        () => createStep_SendWelcome(orgId!),
      ];

      for (let i = 0; i < stepActions.length; i++) {
        updateStep(i + 1, { status: "running" });
        try {
          const result = await stepActions[i]();
          if (!result.ok) {
            updateStep(i + 1, { status: "error", error: result.error });
            setIsFailed(true);
            // Clean up if failure was before activation (step index 4)
            if (i < 5) {
              try {
                await createStep_Cleanup(orgId!);
              } catch {
                /* best effort */
              }
            }
            return;
          }
          updateStep(i + 1, { status: "done" });
        } catch (err) {
          updateStep(i + 1, {
            status: "error",
            error: err instanceof Error ? err.message : "Unexpected error",
          });
          setIsFailed(true);
          if (i < 5) {
            try {
              await createStep_Cleanup(orgId!);
            } catch {
              /* best effort */
            }
          }
          return;
        }
      }

      setIsComplete(true);
    },
    [],
  );

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {formError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Acme Theater Company"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="Tim"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Cooley"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="tim@example.com"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={dialogOpen}>
          Create Organization
        </Button>
      </form>

      <Dialog open={dialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (!isComplete && !isFailed) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {isComplete
                ? "Organization Created"
                : isFailed
                  ? "Creation Failed"
                  : "Creating Organization..."}
            </DialogTitle>
            <DialogDescription>
              {isComplete
                ? "The organization has been provisioned and is ready to use."
                : isFailed
                  ? "An error occurred. The organization has been cleaned up."
                  : "This may take up to two minutes..."}
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

          {(isComplete || isFailed) && (
            <DialogFooter>
              {isComplete && createdOrgId ? (
                <Button
                  onClick={() => router.push(`/admin/orgs/${createdOrgId}`)}
                >
                  View Organization
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
