"use client";

import { useState, useActionState, useTransition, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Switch,
} from "@sgscore/ui";
import { Loader2 } from "lucide-react";
import type { PortalSettings, MembershipCardDesign } from "@sgscore/types/tenant";
import { upsertPortalSettings } from "./actions";

interface SettingsTabProps {
  orgSlug: string;
  settings: PortalSettings | null;
  cardDesigns: MembershipCardDesign[];
}

export function SettingsTab({ orgSlug, settings, cardDesigns }: SettingsTabProps) {
  const [isPublished, setIsPublished] = useState(settings?.is_published ?? false);
  const [portalSlug, setPortalSlug] = useState(settings?.portal_slug ?? "");
  const [restrictedCardDesignIds, setRestrictedCardDesignIds] = useState<Set<string>>(
    new Set(settings?.restricted_card_design_ids ?? []),
  );

  const [state, formAction] = useActionState(upsertPortalSettings, {});
  const [saving, startTransition] = useTransition();

  const save = useCallback(
    (published: boolean, cardIds: Set<string>) => {
      const fd = new FormData();
      fd.append("orgSlug", orgSlug);
      if (settings?.id) fd.append("settingsId", settings.id);
      fd.append("welcomeHeading", settings?.welcome_heading ?? "Welcome to Your Membership Portal");
      fd.append("welcomeBody", settings?.welcome_body ?? "");
      fd.append("buttonText", settings?.button_text ?? "Sign In");
      fd.append("helperText", settings?.helper_text ?? "");
      fd.append("accentColor", settings?.accent_color ?? "#4E2C70");
      fd.append("isPublished", published ? "true" : "false");
      fd.append("restrictedCardDesignIds", JSON.stringify([...cardIds]));
      startTransition(() => formAction(fd));
    },
    [orgSlug, settings, formAction],
  );

  function handlePublishToggle(checked: boolean) {
    setIsPublished(checked);
    save(checked, restrictedCardDesignIds);
  }

  function toggleCardRestriction(cardId: string) {
    setRestrictedCardDesignIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      save(isPublished, next);
      return next;
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Publish toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isPublished">Publish Portal</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When published, members can access the portal login page.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="isPublished"
                checked={isPublished}
                onCheckedChange={handlePublishToggle}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card design restrictions */}
      {cardDesigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Access Restrictions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Restrict portal access to members with specific card designs.
              Leave all unchecked to allow all members.
            </p>
            <div className="space-y-2">
              {cardDesigns.map((cd) => (
                <div key={cd.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cd-${cd.id}`}
                    checked={restrictedCardDesignIds.has(cd.id)}
                    onCheckedChange={() => toggleCardRestriction(cd.id)}
                    disabled={saving}
                  />
                  <Label htmlFor={`cd-${cd.id}`}>{cd.name}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portal slug */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal Slug</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Reserved for future custom URL routing.
          </p>
          <Input
            value={portalSlug}
            onChange={(e) => setPortalSlug(e.target.value)}
            placeholder="portal"
            disabled
          />
        </CardContent>
      </Card>

      {/* Status */}
      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && !saving && (
        <p className="text-sm text-green-600">Settings saved.</p>
      )}
    </div>
  );
}
