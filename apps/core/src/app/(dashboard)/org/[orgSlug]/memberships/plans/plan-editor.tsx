"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sgscore/ui";
import type { MembershipPlan } from "@sgscore/types/tenant";
import { createMembershipPlan, updateMembershipPlan } from "./actions";

interface PlanEditorProps {
  orgSlug: string;
  plan?: MembershipPlan;
}

const DURATION_PRESETS = [
  { label: "Monthly (30 days)", value: "30" },
  { label: "Quarterly (90 days)", value: "90" },
  { label: "6 Months (180 days)", value: "180" },
  { label: "1 Year (365 days)", value: "365" },
  { label: "Custom", value: "custom" },
];

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function PlanEditor({ orgSlug, plan }: PlanEditorProps) {
  const router = useRouter();
  const isEdit = !!plan;

  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [priceDollars, setPriceDollars] = useState(
    plan ? centsToDollars(plan.price_cents) : "",
  );
  const [durationPreset, setDurationPreset] = useState(() => {
    if (!plan) return "365";
    const match = DURATION_PRESETS.find(
      (p) => p.value === String(plan.duration_days),
    );
    return match ? match.value : "custom";
  });
  const [customDays, setCustomDays] = useState(
    plan ? String(plan.duration_days) : "",
  );
  const [seatCount, setSeatCount] = useState(
    plan ? String(plan.seat_count) : "1",
  );
  const [isRecurring, setIsRecurring] = useState(plan?.is_recurring ?? false);

  const action = isEdit ? updateMembershipPlan : createMembershipPlan;
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.success && state.planId) {
      if (!isEdit) {
        router.push(`/org/${orgSlug}/memberships/plans/${state.planId}`);
      }
    }
  }, [state.success, state.planId, isEdit, orgSlug, router]);

  const durationDays =
    durationPreset === "custom" ? customDays : durationPreset;

  function handleSubmit() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (plan) fd.append("planId", plan.id);
    fd.append("name", name);
    fd.append("description", description);
    fd.append("priceCents", String(dollarsToCents(priceDollars)));
    fd.append("durationDays", durationDays);
    fd.append("seatCount", seatCount);
    fd.append("isRecurring", String(isRecurring));
    formAction(fd);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Plan" : "New Membership Plan"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5 max-w-lg">
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && isEdit && (
            <p className="text-sm text-green-600">Plan updated.</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Individual, Family"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this plan"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Price</Label>
            <div className="relative max-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration</Label>
            <Select value={durationPreset} onValueChange={setDurationPreset}>
              <SelectTrigger id="duration" className="max-w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {durationPreset === "custom" && (
              <Input
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Number of days"
                className="mt-2 max-w-[200px]"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seatCount">Seat Count</Label>
            <Input
              id="seatCount"
              type="number"
              min="1"
              value={seatCount}
              onChange={(e) => setSeatCount(e.target.value)}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              {parseInt(seatCount) === 1
                ? "Individual membership"
                : `Family / group membership — ${seatCount} seats`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
            <Label htmlFor="recurring">Recurring (auto-renew)</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSubmit} disabled={pending}>
              {pending
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Plan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/org/${orgSlug}/memberships/plans`)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
