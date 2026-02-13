"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  Button,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@sgscore/ui";
import { Trash2 } from "lucide-react";
import { ImageCropper } from "@/components/image-cropper";
import {
  uploadFaviconAction,
  removeFaviconAction,
  uploadLogoAction,
  removeLogoAction,
} from "./actions";

interface Props {
  faviconUrl: string | null;
  logoUrl: string | null;
}

export function PlatformGeneralForm({ faviconUrl, logoUrl }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <AssetSlot
              label="SGS Favicon"
              hint="1:1 (32x32)"
              url={faviconUrl}
              aspect={1}
              outputWidth={32}
              outputHeight={32}
              uploadAction={uploadFaviconAction}
              removeAction={removeFaviconAction}
              fileName="favicon.png"
            />
            <AssetSlot
              label="SGS Logo"
              hint="Any aspect ratio"
              url={logoUrl}
              aspect={undefined}
              outputWidth={800}
              outputHeight={0}
              uploadAction={uploadLogoAction}
              removeAction={removeLogoAction}
              fileName="logo.png"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AssetSlotProps {
  label: string;
  hint: string;
  url: string | null;
  aspect: number | undefined;
  outputWidth: number;
  outputHeight: number;
  uploadAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  removeAction: (prev: { error?: string; success?: boolean }) => Promise<{ error?: string; success?: boolean }>;
  fileName: string;
}

function AssetSlot({
  label,
  hint,
  url,
  aspect,
  outputWidth,
  outputHeight,
  uploadAction,
  removeAction,
  fileName,
}: AssetSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadFormAction] = useActionState(uploadAction, {});
  const [removeState, removeFormAction] = useActionState(removeAction, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
    startUpload(() => uploadFormAction(formData));
  }

  function handleRemove() {
    startRemove(() => removeFormAction());
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex h-20 items-center justify-center rounded-md border bg-muted/30">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
            className="max-h-16 max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">No image</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>

      {(uploadState.error || removeState.error) && (
        <p className="text-xs text-destructive">
          {uploadState.error || removeState.error}
        </p>
      )}

      <div className="flex gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRemoving}
            onClick={handleRemove}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {cropSrc && (
        <ImageCropper
          open
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onCropComplete={handleCropComplete}
          aspect={aspect}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          fileName={fileName}
          title={`Crop ${label}`}
        />
      )}
    </div>
  );
}
