"use client";

import { useActionState, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
  Textarea,
} from "@sgscore/ui";
import { Loader2, Plus, X } from "lucide-react";
import type { DonationPageConfig } from "@sgscore/types";
import { updateDonationPageConfig } from "./actions";

interface DonationPageFormProps {
  orgSlug: string;
  initialConfig: DonationPageConfig;
}

export function DonationPageForm({
  orgSlug,
  initialConfig,
}: DonationPageFormProps) {
  const [config, setConfig] = useState<DonationPageConfig>(initialConfig);
  const [newDenom, setNewDenom] = useState("");
  const [state, formAction, isPending] = useActionState(
    updateDonationPageConfig,
    {},
  );

  function update<K extends keyof DonationPageConfig>(
    key: K,
    value: DonationPageConfig[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function addDenomination() {
    const dollars = parseFloat(newDenom);
    if (isNaN(dollars) || dollars <= 0) return;
    const cents = Math.round(dollars * 100);
    if (config.denominations.includes(cents)) return;
    update(
      "denominations",
      [...config.denominations, cents].sort((a, b) => a - b),
    );
    setNewDenom("");
  }

  function removeDenomination(cents: number) {
    update(
      "denominations",
      config.denominations.filter((d) => d !== cents),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="config" value={JSON.stringify(config)} />

      {/* Enable / Disable */}
      <Card>
        <CardHeader>
          <CardTitle>Donation Page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-sm font-medium">
                Enable Donation Page
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.enabled
                  ? "The donation page is live on your public storefront."
                  : "The donation page is currently disabled."}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(v) => update("enabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Page Content */}
      <Card>
        <CardHeader>
          <CardTitle>Page Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={config.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Support Our Mission"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={config.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Your generous donation helps us continue our work."
            />
          </div>
        </CardContent>
      </Card>

      {/* Denominations */}
      <Card>
        <CardHeader>
          <CardTitle>Preset Denominations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {config.denominations.map((cents) => (
              <span
                key={cents}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium"
              >
                ${(cents / 100).toFixed(2)}
                <button
                  type="button"
                  onClick={() => removeDenomination(cents)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {config.denominations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No preset denominations. Add at least one.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDenom}
              onChange={(e) => setNewDenom(e.target.value)}
              placeholder="e.g. 25.00"
              className="w-32"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDenomination();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDenomination}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="allowCustomAmount"
                className="text-sm font-medium"
              >
                Allow Custom Amount
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Let donors enter their own amount.
              </p>
            </div>
            <Switch
              id="allowCustomAmount"
              checked={config.allowCustomAmount}
              onCheckedChange={(v) => update("allowCustomAmount", v)}
            />
          </div>
          {config.allowCustomAmount && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min">Minimum ($)</Label>
                <Input
                  id="min"
                  type="number"
                  step="0.01"
                  min="1"
                  value={(config.minimumCents / 100).toFixed(2)}
                  onChange={(e) =>
                    update(
                      "minimumCents",
                      Math.round(parseFloat(e.target.value || "0") * 100),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Maximum ($)</Label>
                <Input
                  id="max"
                  type="number"
                  step="0.01"
                  min="1"
                  value={(config.maximumCents / 100).toFixed(2)}
                  onChange={(e) =>
                    update(
                      "maximumCents",
                      Math.round(parseFloat(e.target.value || "0") * 100),
                    )
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Checkout Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="showInTicketCheckout"
                className="text-sm font-medium"
              >
                Show in Ticket Checkout
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display a donation prompt during ticket purchases.
              </p>
            </div>
            <Switch
              id="showInTicketCheckout"
              checked={config.showInTicketCheckout}
              onCheckedChange={(v) => update("showInTicketCheckout", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="showInEventCheckout"
                className="text-sm font-medium"
              >
                Show in Event Checkout
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Display a donation prompt during event registrations.
              </p>
            </div>
            <Switch
              id="showInEventCheckout"
              checked={config.showInEventCheckout}
              onCheckedChange={(v) => update("showInEventCheckout", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="campaignName">Campaign Name (optional)</Label>
          <Input
            id="campaignName"
            value={config.campaignName ?? ""}
            onChange={(e) =>
              update("campaignName", e.target.value || null)
            }
            placeholder="e.g. Annual Fund 2026"
          />
          <p className="text-xs text-muted-foreground">
            Tag donations with a campaign name for reporting.
          </p>
        </CardContent>
      </Card>

      {/* Submit */}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-600">Configuration saved.</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Configuration
      </Button>
    </form>
  );
}
