"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@sgscore/ui";
import { ImageCropper } from "@/components/image-cropper";
import {
  updateDisplayName,
  updateEmail,
  uploadAvatarAction,
  removeAvatarAction,
} from "./actions";

interface AccountFormProps {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export function AccountForm({
  displayName,
  email,
  avatarUrl,
}: AccountFormProps) {
  return (
    <div className="max-w-2xl space-y-6">
      <AvatarSection displayName={displayName} avatarUrl={avatarUrl} />
      <DisplayNameSection displayName={displayName} />
      <EmailSection email={email} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile Photo
// ---------------------------------------------------------------------------

function AvatarSection({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction] = useActionState(uploadAvatarAction, {});
  const [removeState, removeAction] = useActionState(removeAvatarAction, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  // Cropper state
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const initials = (displayName || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file into data URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Reset the input so the same file can be re-selected
    e.target.value = "";
  }

  function handleCropComplete(croppedFile: File) {
    setCropSrc(null);

    const formData = new FormData();
    formData.append("file", croppedFile);

    startUpload(() => {
      uploadAction(formData);
    });
  }

  function handleRemove() {
    const formData = new FormData();
    startRemove(() => {
      removeAction(formData);
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Avatar className="h-24 w-24 text-2xl">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile photo" />}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <p className="text-sm text-muted-foreground">
            Square image, 256&times;256px output. Max 2 MB. PNG, JPG, or WebP.
          </p>

          {uploadState.error && (
            <p className="text-sm text-destructive">{uploadState.error}</p>
          )}
          {uploadState.success && (
            <p className="text-sm text-green-600">{uploadState.success}</p>
          )}
          {removeState.error && (
            <p className="text-sm text-destructive">{removeState.error}</p>
          )}
          {removeState.success && (
            <p className="text-sm text-green-600">{removeState.success}</p>
          )}

          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? "Uploading..." : "Upload Photo"}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="outline"
                disabled={isRemoving}
                onClick={handleRemove}
              >
                {isRemoving ? "Removing..." : "Remove Photo"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {cropSrc && (
        <ImageCropper
          open
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onCropComplete={handleCropComplete}
          aspect={1}
          outputWidth={256}
          outputHeight={256}
          fileName="avatar.png"
          title="Crop Profile Photo"
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Display Name
// ---------------------------------------------------------------------------

function DisplayNameSection({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Name</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={displayName}
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">{state.success}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Email Address
// ---------------------------------------------------------------------------

function EmailSection({ email }: { email: string }) {
  const [state, action, pending] = useActionState(updateEmail, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              required
            />
            <p className="text-sm text-muted-foreground">
              Changing your email requires verification. A confirmation link will
              be sent to the new address.
            </p>
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">{state.success}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
