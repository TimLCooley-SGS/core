"use client";

import { useState, useRef, useEffect, useActionState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@sgscore/ui";
import type { PortalSettings } from "@sgscore/types/tenant";
import { TiptapEditor } from "./tiptap-editor";
import { DesignerPreview } from "./designer-preview";
import { ImageCropper } from "../cards/image-cropper";
import {
  upsertPortalSettings,
  uploadPortalHeroImage,
  removePortalHeroImage,
} from "./actions";

// Reuse ImageCropper with 16:9 aspect
const HERO_ASPECT = 16 / 9;

interface DesignerTabProps {
  orgSlug: string;
  settings: PortalSettings | null;
}

export function DesignerTab({ orgSlug, settings }: DesignerTabProps) {
  const [heroImageUrl, setHeroImageUrl] = useState(settings?.hero_image_url ?? null);
  const [welcomeHeading, setWelcomeHeading] = useState(
    settings?.welcome_heading ?? "Welcome to Your Membership Portal",
  );
  const [welcomeBody, setWelcomeBody] = useState(settings?.welcome_body ?? "");
  const [buttonText, setButtonText] = useState(settings?.button_text ?? "Sign In");
  const [helperText, setHelperText] = useState(settings?.helper_text ?? "");
  const [accentColor, setAccentColor] = useState(settings?.accent_color ?? "#4E2C70");

  // Form actions
  const [saveState, saveAction, savePending] = useActionState(upsertPortalSettings, {});
  const [uploadState, uploadAction] = useActionState(uploadPortalHeroImage, {});
  const [removeState, removeAction] = useActionState(removePortalHeroImage, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  useEffect(() => {
    if (uploadState.success && uploadState.imageUrl) {
      setHeroImageUrl(uploadState.imageUrl);
    }
  }, [uploadState.success, uploadState.imageUrl]);

  useEffect(() => {
    if (removeState.success) {
      setHeroImageUrl(null);
    }
  }, [removeState.success]);

  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (settings?.id) fd.append("settingsId", settings.id);
    fd.append("welcomeHeading", welcomeHeading);
    fd.append("welcomeBody", welcomeBody);
    fd.append("buttonText", buttonText);
    fd.append("helperText", helperText);
    fd.append("accentColor", accentColor);
    saveAction(fd);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCropComplete(croppedFile: File) {
    setCropperOpen(false);
    setCropperSrc(null);

    if (!settings?.id) return;

    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("settingsId", settings.id);
    fd.append("file", croppedFile);
    startUpload(() => {
      uploadAction(fd);
    });
  }

  function handleRemoveImage() {
    if (!settings?.id) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("settingsId", settings.id);
    startRemove(() => {
      removeAction(fd);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Editor controls */}
      <div className="lg:col-span-2 space-y-4">
        {/* Hero image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hero Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {heroImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt="Portal hero"
                className="max-w-[300px] rounded-md border"
                style={{ aspectRatio: "16 / 9", objectFit: "cover" }}
              />
            )}
            <p className="text-sm text-muted-foreground">
              Recommended: 16:9 aspect ratio. Max 2 MB. PNG, JPG, WebP, or SVG.
            </p>
            {uploadState.error && (
              <p className="text-sm text-destructive">{uploadState.error}</p>
            )}
            {removeState.error && (
              <p className="text-sm text-destructive">{removeState.error}</p>
            )}
            {settings?.id ? (
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
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? "Uploading..." : "Upload Image"}
                </Button>
                {heroImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRemoving}
                    onClick={handleRemoveImage}
                  >
                    {isRemoving ? "Removing..." : "Remove Image"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Save settings first, then upload a hero image.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Welcome heading */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Welcome Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeHeading">Heading</Label>
              <Input
                id="welcomeHeading"
                value={welcomeHeading}
                onChange={(e) => setWelcomeHeading(e.target.value)}
                placeholder="Welcome to Your Membership Portal"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (rich text)</Label>
              <TiptapEditor
                content={welcomeBody}
                onChange={setWelcomeBody}
                placeholder="Add a welcome message for your members..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Button & helper */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Login Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buttonText">Button Text</Label>
              <Input
                id="buttonText"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Sign In"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="helperText">Helper Text</Label>
              <Input
                id="helperText"
                value={helperText}
                onChange={(e) => setHelperText(e.target.value)}
                placeholder="Enter your email to access your portal."
              />
            </div>
          </CardContent>
        </Card>

        {/* Accent color */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accent Color</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-8 w-8 rounded border cursor-pointer"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="font-mono text-xs w-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        {saveState.error && (
          <p className="text-sm text-destructive">{saveState.error}</p>
        )}
        {saveState.success && (
          <p className="text-sm text-green-600">Settings saved.</p>
        )}
        <Button
          type="button"
          disabled={savePending}
          onClick={handleSave}
        >
          {savePending ? "Saving..." : "Save Designer Settings"}
        </Button>
      </div>

      {/* Right: Sticky preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <DesignerPreview
          heroImageUrl={heroImageUrl}
          welcomeHeading={welcomeHeading}
          welcomeBody={welcomeBody}
          buttonText={buttonText}
          helperText={helperText}
          accentColor={accentColor}
        />
      </div>

      {/* Image Cropper Dialog */}
      {cropperSrc && (
        <ImageCropper
          open={cropperOpen}
          imageSrc={cropperSrc}
          onClose={() => {
            setCropperOpen(false);
            setCropperSrc(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
