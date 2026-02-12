"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction] = useActionState(uploadAvatarAction, {});
  const [removeState, removeAction] = useActionState(removeAvatarAction, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const [nameState, nameAction, namePending] = useActionState(
    updateDisplayName,
    {},
  );
  const [emailState, emailAction, emailPending] = useActionState(
    updateEmail,
    {},
  );

  const initials = (displayName || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCropComplete(croppedFile: File) {
    setCropSrc(null);
    const formData = new FormData();
    formData.append("file", croppedFile);
    startUpload(() => uploadAction(formData));
  }

  function handleRemove() {
    const formData = new FormData();
    startRemove(() => removeAction(formData));
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Left: Avatar */}
            <div className="flex flex-col items-center gap-1.5">
              <Avatar className="h-14 w-14 text-base">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt="Profile photo" />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
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
                size="sm"
                className="h-7 text-xs px-2"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  disabled={isRemoving}
                  onClick={handleRemove}
                >
                  {isRemoving ? "Removing..." : "Remove"}
                </Button>
              )}
              {(uploadState.error || removeState.error) && (
                <p className="text-xs text-destructive">
                  {uploadState.error || removeState.error}
                </p>
              )}
            </div>

            {/* Right: Name + Email */}
            <div className="flex-1 space-y-3">
              <form action={nameAction} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="displayName" className="text-xs">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    defaultValue={displayName}
                    required
                    className="h-8 text-sm"
                  />
                  {nameState.error && (
                    <p className="text-xs text-destructive">
                      {nameState.error}
                    </p>
                  )}
                  {nameState.success && (
                    <p className="text-xs text-green-600">
                      {nameState.success}
                    </p>
                  )}
                </div>
                <Button type="submit" size="sm" className="h-8" disabled={namePending}>
                  {namePending ? "Saving..." : "Save"}
                </Button>
              </form>

              <form action={emailAction} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={email}
                    required
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Changing your email requires verification.
                  </p>
                  {emailState.error && (
                    <p className="text-xs text-destructive">
                      {emailState.error}
                    </p>
                  )}
                  {emailState.success && (
                    <p className="text-xs text-green-600">
                      {emailState.success}
                    </p>
                  )}
                </div>
                <Button type="submit" size="sm" className="h-8" disabled={emailPending}>
                  {emailPending ? "Saving..." : "Save"}
                </Button>
              </form>
            </div>
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
    </div>
  );
}
