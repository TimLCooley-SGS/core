"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@sgscore/ui";
import { createOrganization } from "./actions";

export function CreateOrgForm() {
  const [state, formAction, isPending] = useActionState(createOrganization, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
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

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="acme-theater"
          pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
          minLength={3}
          maxLength={63}
          required
        />
        <p className="text-xs text-muted-foreground">
          Used in URLs. Lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan_tier">Plan Tier</Label>
        <Input id="plan_tier" name="plan_tier" placeholder="starter" />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating..." : "Create Organization"}
      </Button>
    </form>
  );
}
