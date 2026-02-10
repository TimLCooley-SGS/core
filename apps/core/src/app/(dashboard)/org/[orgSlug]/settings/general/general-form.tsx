"use client";

import { useActionState, useRef, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sgscore/ui";
import { useHasCapability } from "@/components/org-provider";
import {
  updateOrgName,
  uploadOrgLogoAction,
  removeOrgLogoAction,
} from "./actions";

interface GeneralFormProps {
  orgSlug: string;
  orgName: string;
  logoUrl: string | null;
}

export function GeneralForm({ orgSlug, orgName, logoUrl }: GeneralFormProps) {
  const canEdit = useHasCapability("settings.update");

  return (
    <div className="space-y-6">
      <OrgNameSection orgSlug={orgSlug} orgName={orgName} canEdit={canEdit} />
      <LogoSection orgSlug={orgSlug} logoUrl={logoUrl} canEdit={canEdit} />
    </div>
  );
}

function OrgNameSection({
  orgSlug,
  orgName,
  canEdit,
}: {
  orgSlug: string;
  orgName: string;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updateOrgName, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Name</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={orgName}
              disabled={!canEdit}
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">Name updated.</p>
          )}
          {canEdit && (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function LogoSection({
  orgSlug,
  logoUrl,
  canEdit,
}: {
  orgSlug: string;
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction] = useActionState(uploadOrgLogoAction, {});
  const [removeState, removeAction] = useActionState(removeOrgLogoAction, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("orgSlug", orgSlug);
    formData.append("file", file);

    startUpload(() => {
      uploadAction(formData);
    });

    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  function handleRemove() {
    const formData = new FormData();
    formData.append("orgSlug", orgSlug);

    startRemove(() => {
      removeAction(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logoUrl && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Organization logo"
              className="max-w-[200px] rounded-md border"
            />
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Recommended: 200&times;200px minimum, square aspect ratio. Max 2 MB.
          PNG, JPG, WebP, or SVG.
        </p>

        {uploadState.error && (
          <p className="text-sm text-destructive">{uploadState.error}</p>
        )}
        {uploadState.success && (
          <p className="text-sm text-green-600">Logo uploaded.</p>
        )}
        {removeState.error && (
          <p className="text-sm text-destructive">{removeState.error}</p>
        )}
        {removeState.success && (
          <p className="text-sm text-green-600">Logo removed.</p>
        )}

        {canEdit && (
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Uploading..." : "Upload Logo"}
            </Button>
            {logoUrl && (
              <Button
                type="button"
                variant="outline"
                disabled={isRemoving}
                onClick={handleRemove}
              >
                {isRemoving ? "Removing..." : "Remove Logo"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
