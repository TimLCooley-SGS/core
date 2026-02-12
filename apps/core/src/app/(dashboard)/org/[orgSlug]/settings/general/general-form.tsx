"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sgscore/ui";
import { ChevronUp, ChevronDown, Eye, Trash2 } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import { ImageCropper } from "@/components/image-cropper";
import type { OrgBranding, PosNavItem, LogoVariant } from "@sgscore/types";
import { DEFAULT_POS_NAV, FONT_OPTIONS, DEFAULT_BRANDING } from "@sgscore/types";
import {
  updateOrgName,
  uploadOrgLogoAction,
  removeOrgLogoAction,
  updateBrandingAction,
  updatePosNavigationAction,
} from "./actions";

interface ThemeEditorProps {
  orgSlug: string;
  orgName: string;
  branding: Partial<OrgBranding>;
  posNavigation: PosNavItem[] | null;
}

export function ThemeEditor({
  orgSlug,
  orgName,
  branding,
  posNavigation,
}: ThemeEditorProps) {
  const canEdit = useHasCapability("settings.update");

  return (
    <div className="space-y-6">
      <IdentitySection
        orgSlug={orgSlug}
        orgName={orgName}
        branding={branding}
        canEdit={canEdit}
      />
      <ColorsSection orgSlug={orgSlug} branding={branding} canEdit={canEdit} />
      <PosNavigationSection
        orgSlug={orgSlug}
        posNavigation={posNavigation}
        canEdit={canEdit}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Organization Identity
// ---------------------------------------------------------------------------

interface LogoSlotConfig {
  variant: LogoVariant;
  label: string;
  brandingKey: keyof OrgBranding;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  hint: string;
}

const LOGO_SLOTS: LogoSlotConfig[] = [
  {
    variant: "primary",
    label: "Primary Logo",
    brandingKey: "logoUrl",
    aspect: 0, // free aspect
    outputWidth: 800,
    outputHeight: 0,
    hint: "Any aspect ratio",
  },
  {
    variant: "wide",
    label: "Wide Logo",
    brandingKey: "logoWideUrl",
    aspect: 3,
    outputWidth: 600,
    outputHeight: 200,
    hint: "3:1 (600x200)",
  },
  {
    variant: "square",
    label: "Square Logo",
    brandingKey: "logoSquareUrl",
    aspect: 1,
    outputWidth: 256,
    outputHeight: 256,
    hint: "1:1 (256x256)",
  },
  {
    variant: "favicon",
    label: "Favicon",
    brandingKey: "faviconUrl",
    aspect: 1,
    outputWidth: 32,
    outputHeight: 32,
    hint: "1:1 (32x32)",
  },
];

function IdentitySection({
  orgSlug,
  orgName,
  branding,
  canEdit,
}: {
  orgSlug: string;
  orgName: string;
  branding: Partial<OrgBranding>;
  canEdit: boolean;
}) {
  const [nameState, nameAction, namePending] = useActionState(
    updateOrgName,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Org name */}
        <form action={nameAction} className="space-y-2">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <Label htmlFor="name">Organization Name</Label>
          <div className="flex items-center gap-3">
            <Input
              id="name"
              name="name"
              defaultValue={orgName}
              disabled={!canEdit}
              required
              className="flex-1"
            />
            {canEdit && (
              <Button type="submit" size="sm" disabled={namePending}>
                {namePending ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
          {nameState.error && (
            <p className="text-xs text-destructive">{nameState.error}</p>
          )}
          {nameState.success && (
            <p className="text-xs text-green-600">Saved</p>
          )}
        </form>

        {/* Logo grid */}
        <div>
          <Label className="mb-3 block">Logo Variants</Label>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {LOGO_SLOTS.map((slot) => (
              <LogoSlot
                key={slot.variant}
                config={slot}
                orgSlug={orgSlug}
                url={(branding[slot.brandingKey] as string) ?? null}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LogoSlot({
  config,
  orgSlug,
  url,
  canEdit,
}: {
  config: LogoSlotConfig;
  orgSlug: string;
  url: string | null;
  canEdit: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction] = useActionState(uploadOrgLogoAction, {});
  const [removeState, removeAction] = useActionState(removeOrgLogoAction, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // For free-aspect primary logo or favicon, skip cropper (or show it)
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleCropComplete(croppedFile: File) {
    setCropSrc(null);
    const formData = new FormData();
    formData.append("orgSlug", orgSlug);
    formData.append("variant", config.variant);
    formData.append("file", croppedFile);
    startUpload(() => uploadAction(formData));
  }

  function handleRemove() {
    const formData = new FormData();
    formData.append("orgSlug", orgSlug);
    formData.append("variant", config.variant);
    startRemove(() => removeAction(formData));
  }

  // For the primary logo, use free-form aspect (pass undefined)
  const cropAspect = config.aspect === 0 ? undefined : config.aspect;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{config.label}</p>
      <div className="flex h-16 items-center justify-center rounded-md border bg-muted/30">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={config.label}
            className="max-h-14 max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-muted-foreground">No image</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{config.hint}</p>

      {(uploadState.error || removeState.error) && (
        <p className="text-xs text-destructive">
          {uploadState.error || removeState.error}
        </p>
      )}

      {canEdit && (
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
            {isUploading ? "..." : "Upload"}
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
      )}

      {cropSrc && (
        <ImageCropper
          open
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onCropComplete={handleCropComplete}
          aspect={cropAspect}
          outputWidth={config.outputWidth}
          outputHeight={config.outputHeight}
          fileName={`${config.variant}.png`}
          title={`Crop ${config.label}`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Colors & Typography
// ---------------------------------------------------------------------------

function ColorsSection({
  orgSlug,
  branding,
  canEdit,
}: {
  orgSlug: string;
  branding: Partial<OrgBranding>;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updateBrandingAction, {});

  const [primary, setPrimary] = useState(
    branding.primaryColor ?? DEFAULT_BRANDING.primaryColor,
  );
  const [secondary, setSecondary] = useState(
    branding.secondaryColor ?? DEFAULT_BRANDING.secondaryColor ?? "",
  );
  const [accent, setAccent] = useState(
    branding.accentColor ?? DEFAULT_BRANDING.accentColor ?? "",
  );
  const [headingFont, setHeadingFont] = useState(
    branding.headingFont ?? DEFAULT_BRANDING.headingFont ?? "system-ui",
  );
  const [bodyFont, setBodyFont] = useState(
    branding.bodyFont ?? DEFAULT_BRANDING.bodyFont ?? "system-ui",
  );
  const [borderRadius, setBorderRadius] = useState(
    branding.borderRadius ?? DEFAULT_BRANDING.borderRadius ?? "0.5rem",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Colors & Typography</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <input type="hidden" name="orgSlug" value={orgSlug} />

          {/* Colors */}
          <div className="grid grid-cols-3 gap-4">
            <ColorPicker
              label="Primary"
              name="primaryColor"
              value={primary}
              onChange={setPrimary}
              disabled={!canEdit}
            />
            <ColorPicker
              label="Secondary"
              name="secondaryColor"
              value={secondary}
              onChange={setSecondary}
              disabled={!canEdit}
            />
            <ColorPicker
              label="Accent"
              name="accentColor"
              value={accent}
              onChange={setAccent}
              disabled={!canEdit}
            />
          </div>

          {/* Fonts + border radius */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Heading Font</Label>
              <input type="hidden" name="headingFont" value={headingFont} />
              <Select
                value={headingFont}
                onValueChange={setHeadingFont}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Body Font</Label>
              <input type="hidden" name="bodyFont" value={bodyFont} />
              <Select
                value={bodyFont}
                onValueChange={setBodyFont}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Border Radius</Label>
              <input type="hidden" name="borderRadius" value={borderRadius} />
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.125}
                  value={parseFloat(borderRadius)}
                  onChange={(e) => setBorderRadius(`${e.target.value}rem`)}
                  disabled={!canEdit}
                  className="flex-1"
                />
                <span className="w-16 text-right text-sm text-muted-foreground">
                  {borderRadius}
                </span>
              </div>
            </div>
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">Branding updated.</p>
          )}

          {canEdit && (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving..." : "Save Colors & Fonts"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ColorPicker({
  label,
  name,
  value,
  onChange,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-9 cursor-pointer rounded border p-0.5"
        />
        <Input
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono text-sm"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3: POS Navigation
// ---------------------------------------------------------------------------

function PosNavigationSection({
  orgSlug,
  posNavigation,
  canEdit,
}: {
  orgSlug: string;
  posNavigation: PosNavItem[] | null;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(
    updatePosNavigationAction,
    {},
  );
  const [items, setItems] = useState<PosNavItem[]>(
    () =>
      (posNavigation ?? DEFAULT_POS_NAV).slice().sort((a: PosNavItem, b: PosNavItem) => a.order - b.order),
  );

  function toggleVisible(idx: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, visible: !item.visible } : item,
      ),
    );
  }

  function updateLabel(idx: number, label: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, label } : item)),
    );
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setItems((prev) => {
      const next = [...prev];
      const prevOrder = next[idx - 1].order;
      next[idx - 1] = { ...next[idx - 1], order: next[idx].order };
      next[idx] = { ...next[idx], order: prevOrder };
      return next.slice().sort((a: PosNavItem, b: PosNavItem) => a.order - b.order);
    });
  }

  function moveDown(idx: number) {
    if (idx >= items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      const nextOrder = next[idx + 1].order;
      next[idx + 1] = { ...next[idx + 1], order: next[idx].order };
      next[idx] = { ...next[idx], order: nextOrder };
      return next.slice().sort((a: PosNavItem, b: PosNavItem) => a.order - b.order);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation Menu</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input
            type="hidden"
            name="navigation"
            value={JSON.stringify(items)}
          />

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <Switch
                  checked={item.visible}
                  onCheckedChange={() => toggleVisible(idx)}
                  disabled={!canEdit}
                />
                <Input
                  value={item.label}
                  onChange={(e) => updateLabel(idx, e.target.value)}
                  disabled={!canEdit}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  /{item.key}
                </span>
                <a
                  href={`${process.env.NEXT_PUBLIC_POS_URL || "https://pos-five-lemon.vercel.app"}/${orgSlug}/${item.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View /${item.key}`}
                >
                  <Button type="button" variant="ghost" size="sm" tabIndex={-1}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={idx === 0 || !canEdit}
                  onClick={() => moveUp(idx)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={idx === items.length - 1 || !canEdit}
                  onClick={() => moveDown(idx)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">Menu updated.</p>
          )}

          {canEdit && (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving..." : "Save Menu"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
