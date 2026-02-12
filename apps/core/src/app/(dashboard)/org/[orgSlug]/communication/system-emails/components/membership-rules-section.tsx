"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@sgscore/ui";
import { Plus, Trash2, Loader2, Info } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import type { MembershipEmailRule, SystemEmailTemplate } from "../actions";
import {
  updateMembershipEmailRule,
  createMembershipEmailRule,
  deleteMembershipEmailRule,
} from "../actions";

interface MembershipRulesSectionProps {
  rules: MembershipEmailRule[];
  membershipTemplates: SystemEmailTemplate[];
}

function describeTrigger(rule: MembershipEmailRule): string {
  if (rule.trigger_event === "purchase") {
    if (rule.offset_days === 0) return "On purchase";
    return `${Math.abs(rule.offset_days)} day${Math.abs(rule.offset_days) !== 1 ? "s" : ""} after purchase`;
  }
  if (rule.offset_days === 0) return "On expiration day";
  if (rule.offset_days < 0) {
    return `${Math.abs(rule.offset_days)} day${Math.abs(rule.offset_days) !== 1 ? "s" : ""} before expiration`;
  }
  return `${rule.offset_days} day${rule.offset_days !== 1 ? "s" : ""} after expiration`;
}

export function MembershipRulesSection({
  rules,
  membershipTemplates,
}: MembershipRulesSectionProps) {
  const { org } = useOrg();
  const [isPending, startTransition] = useTransition();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Add rule form state
  const [newTemplateId, setNewTemplateId] = useState("");
  const [newTrigger, setNewTrigger] = useState<"purchase" | "expiration">("expiration");
  const [newOffsetDays, setNewOffsetDays] = useState(0);

  function handleToggleActive(ruleId: string, isActive: boolean) {
    startTransition(async () => {
      await updateMembershipEmailRule(org.slug, ruleId, { is_active: !isActive });
    });
  }

  function handleDelete(ruleId: string) {
    startTransition(async () => {
      await deleteMembershipEmailRule(org.slug, ruleId);
    });
  }

  function handleAdd() {
    if (!newTemplateId) return;
    startTransition(async () => {
      await createMembershipEmailRule(org.slug, {
        email_template_id: newTemplateId,
        trigger_event: newTrigger,
        offset_days: newOffsetDays,
      });
      setShowAddDialog(false);
      setNewTemplateId("");
      setNewTrigger("expiration");
      setNewOffsetDays(0);
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Membership Email Rules</h3>
          <Badge variant="secondary">{rules.length}</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </Button>
      </div>

      {/* Info banner */}
      <Card className="mb-4 border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 py-3 px-4">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Automated scheduling coming soon — configure rules now for when it&apos;s ready.
          </p>
        </CardContent>
      </Card>

      {/* Rules table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2 font-medium">Template</th>
              <th className="text-left px-4 py-2 font-medium">Trigger</th>
              <th className="text-center px-4 py-2 font-medium">Active</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {rule.template_name}
                    {rule.is_system && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {describeTrigger(rule)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.is_active}
                    onClick={() => handleToggleActive(rule.id, rule.is_active)}
                    disabled={isPending}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      rule.is_active ? "bg-primary" : "bg-input"
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                        rule.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {!rule.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No membership email rules configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Rule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Membership Email Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Template</Label>
              <select
                value={newTemplateId}
                onChange={(e) => setNewTemplateId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">Select a template...</option>
                {membershipTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Trigger Event</Label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value as "purchase" | "expiration")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="purchase">Purchase</option>
                <option value="expiration">Expiration</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Offset (days)</Label>
              <Input
                type="number"
                value={newOffsetDays}
                onChange={(e) => setNewOffsetDays(Number(e.target.value))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Use negative numbers for &quot;before&quot; (e.g., -30 = 30 days before expiration).
                Use 0 for the day of the event.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isPending || !newTemplateId}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
