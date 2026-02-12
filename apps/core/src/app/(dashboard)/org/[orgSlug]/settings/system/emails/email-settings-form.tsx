"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@sgscore/ui";
import { Loader2, Check } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { updateFromEmail } from "./actions";

interface EmailSettingsFormProps {
  initialFromEmail: string | null;
}

export function EmailSettingsForm({ initialFromEmail }: EmailSettingsFormProps) {
  const { org } = useOrg();
  const [fromEmail, setFromEmail] = useState(initialFromEmail ?? "");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      setResult(null);
      const res = await updateFromEmail(org.slug, fromEmail);
      setResult(res.error ?? "Saved!");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>From Email Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="from-email">Email Address</Label>
          <Input
            id="from-email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="noreply@yourdomain.com"
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Used as the sender for all organization emails. Must be verified in SendGrid.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save
          </Button>
          {result && (
            <span className={`text-sm ${result === "Saved!" ? "text-green-600 flex items-center gap-1" : "text-destructive"}`}>
              {result === "Saved!" && <Check className="h-4 w-4" />}
              {result}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
