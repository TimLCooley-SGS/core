"use client";

import { useState, useRef, useEffect, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sgscore/ui";
import type {
  MembershipCardField,
  MembershipCardDesign,
  MembershipCardOptions,
  MembershipPlanStatus,
} from "@sgscore/types/tenant";
import { CardPreview } from "./card-preview";
import { ImageCropper } from "./image-cropper";
import {
  createCardDesign,
  updateCardDesign,
  uploadFrontImage,
  removeFrontImage,
} from "./actions";

const ALL_FIELDS: { key: MembershipCardField; label: string }[] = [
  { key: "program_name", label: "Program Name" },
  { key: "member_name", label: "Member Name" },
  { key: "membership_id", label: "Membership ID" },
  { key: "status", label: "Status" },
  { key: "expiration_date", label: "Expiration Date" },
  { key: "start_date", label: "Start Date" },
  { key: "amount", label: "Amount" },
  { key: "seat_count", label: "Seat Count" },
  { key: "barcode", label: "Barcode" },
  { key: "member_since", label: "Member Since" },
];

interface MembershipPlanOption {
  id: string;
  name: string;
  status: MembershipPlanStatus;
}

interface CardEditorProps {
  orgSlug: string;
  card?: MembershipCardDesign;
  plans: MembershipPlanOption[];
}

const DEFAULT_OPTIONS: MembershipCardOptions = {
  print: true,
  download_pdf: true,
  apple_wallet: false,
  google_wallet: false,
  push_notifications: false,
};

export function CardEditor({ orgSlug, card, plans }: CardEditorProps) {
  const router = useRouter();
  const isEdit = !!card;

  // Designer state
  const [activeSide, setActiveSide] = useState<"front" | "back">(
    card?.default_side ?? "front",
  );
  const [frontFields, setFrontFields] = useState<MembershipCardField[]>(
    card?.front_fields ?? ["program_name", "member_name", "expiration_date", "status"],
  );
  const [backFields, setBackFields] = useState<MembershipCardField[]>(
    card?.back_fields ?? ["membership_id", "barcode", "member_since", "amount"],
  );
  const [fontColor, setFontColor] = useState(card?.font_color ?? "#000000");
  const [accentColor, setAccentColor] = useState(card?.accent_color ?? "#4E2C70");
  const [backgroundColor, setBackgroundColor] = useState(
    card?.background_color ?? "#FFFFFF",
  );
  const [frontImageUrl, setFrontImageUrl] = useState<string | null>(
    card?.front_image_url ?? null,
  );

  // Settings state
  const [name, setName] = useState(card?.name ?? "");
  const [pdfName, setPdfName] = useState(card?.pdf_name ?? "");
  const [defaultSide, setDefaultSide] = useState<"front" | "back">(
    card?.default_side ?? "front",
  );
  const [isDefault, setIsDefault] = useState(card?.is_default ?? false);
  const [options, setOptions] = useState<MembershipCardOptions>(
    card?.card_options ?? DEFAULT_OPTIONS,
  );
  const [restrictedPlanIds, setRestrictedPlanIds] = useState<Set<string>>(
    new Set(card?.restricted_plan_ids ?? []),
  );

  // Form actions
  const action = isEdit ? updateCardDesign : createCardDesign;
  const [state, formAction, pending] = useActionState(action, {});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, uploadAction] = useActionState(uploadFrontImage, {});
  const [removeState, removeAction] = useActionState(removeFrontImage, {});
  const [isUploading, startUpload] = useTransition();
  const [isRemoving, startRemove] = useTransition();

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  // Preview side tracks designer side
  const [previewSide, setPreviewSide] = useState<"front" | "back">(activeSide);
  useEffect(() => {
    setPreviewSide(activeSide);
  }, [activeSide]);

  // Redirect on successful create
  useEffect(() => {
    if (state.success && state.cardId && !isEdit) {
      router.push(`/org/${orgSlug}/memberships/cards/${state.cardId}`);
    }
  }, [state.success, state.cardId, isEdit, orgSlug, router]);

  // Update local image state on successful upload/remove
  useEffect(() => {
    if (uploadState.success) {
      // Reload to get new image URL
      router.refresh();
    }
  }, [uploadState.success, router]);

  useEffect(() => {
    if (removeState.success) {
      setFrontImageUrl(null);
    }
  }, [removeState.success]);

  const currentFields = activeSide === "front" ? frontFields : backFields;
  const setCurrentFields =
    activeSide === "front" ? setFrontFields : setBackFields;
  const atMax = currentFields.length >= 4;

  function toggleField(field: MembershipCardField) {
    setCurrentFields((prev) => {
      if (prev.includes(field)) {
        return prev.filter((f) => f !== field);
      }
      if (prev.length >= 4) return prev;
      return [...prev, field];
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !card) return;

    // Read file as data URL and open cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  }

  function handleCropComplete(croppedFile: File) {
    if (!card) return;
    setCropperOpen(false);
    setCropperSrc(null);

    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("cardId", card.id);
    fd.append("file", croppedFile);

    startUpload(() => {
      uploadAction(fd);
    });
  }

  function handleRemoveImage() {
    if (!card) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("cardId", card.id);

    startRemove(() => {
      removeAction(fd);
    });
  }

  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (card) fd.append("cardId", card.id);
    fd.append("name", name);
    fd.append("pdfName", pdfName);
    fd.append("frontFields", JSON.stringify(frontFields));
    fd.append("backFields", JSON.stringify(backFields));
    fd.append("fontColor", fontColor);
    fd.append("accentColor", accentColor);
    fd.append("backgroundColor", backgroundColor);
    fd.append("defaultSide", defaultSide);
    fd.append("isDefault", isDefault.toString());
    fd.append("opt_print", options.print.toString());
    fd.append("opt_download_pdf", options.download_pdf.toString());
    fd.append("opt_apple_wallet", options.apple_wallet.toString());
    fd.append("opt_google_wallet", options.google_wallet.toString());
    fd.append("opt_push_notifications", options.push_notifications.toString());

    const restricted = Array.from(restrictedPlanIds);
    fd.append("restrictedPlanIds", restricted.length > 0 ? JSON.stringify(restricted) : "");

    formAction(fd);
  }

  function toggleOption(key: keyof MembershipCardOptions) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function togglePlanRestriction(planId: string) {
    setRestrictedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  }

  const activePlans = plans.filter((p) => p.status === "active");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Editor */}
      <div className="lg:col-span-2 space-y-4">
        <Tabs defaultValue="designer">
          <TabsList>
            <TabsTrigger value="designer">Designer</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="designer" className="space-y-6 mt-4">
            {/* Side selector */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={activeSide === "front" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSide("front")}
              >
                Front Side
              </Button>
              <Button
                type="button"
                variant={activeSide === "back" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSide("back")}
              >
                Back Side
              </Button>
            </div>

            {/* Field toggles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {activeSide === "front" ? "Front" : "Back"} Fields
                  {atMax && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (max 4 reached)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_FIELDS.map(({ key, label }) => {
                    const checked = currentFields.includes(key);
                    const disabled = !checked && atMax;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <Label
                          htmlFor={`field-${key}`}
                          className={disabled ? "text-muted-foreground" : ""}
                        >
                          {label}
                          {disabled && (
                            <span className="ml-1 text-xs">(max 4)</span>
                          )}
                        </Label>
                        <Switch
                          id={`field-${key}`}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={() => toggleField(key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Image upload (front only) */}
            {activeSide === "front" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Front Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {frontImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frontImageUrl}
                      alt="Card front image"
                      className="max-w-[200px] rounded-md border"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    Recommended: 675x425px. Max 2 MB. PNG, JPG, WebP, or SVG.
                  </p>
                  {uploadState.error && (
                    <p className="text-sm text-destructive">
                      {uploadState.error}
                    </p>
                  )}
                  {removeState.error && (
                    <p className="text-sm text-destructive">
                      {removeState.error}
                    </p>
                  )}
                  {isEdit ? (
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
                      {frontImageUrl && (
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
                      Save the card first, then upload an image.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fontColor">Font Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="fontColor"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="h-8 w-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="font-mono text-xs w-24"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="accentColor"
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bgColor">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="bgColor"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-8 w-8 rounded border cursor-pointer"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="font-mono text-xs w-24"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-4">
            {/* Card name / PDF name */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Card Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Card Name *</Label>
                  <Input
                    id="cardName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Member Card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdfName">PDF File Name</Label>
                  <Input
                    id="pdfName"
                    value={pdfName}
                    onChange={(e) => setPdfName(e.target.value)}
                    placeholder="e.g. membership-card"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Default side + default card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Display</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Default Side</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={defaultSide === "front" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDefaultSide("front")}
                    >
                      Front
                    </Button>
                    <Button
                      type="button"
                      variant={defaultSide === "back" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDefaultSide("back")}
                    >
                      Back
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isDefault">Set as Default Card</Label>
                  <Switch
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={(checked) =>
                      setIsDefault(checked === true)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Card Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(
                    [
                      { key: "print", label: "Print" },
                      { key: "download_pdf", label: "Download PDF" },
                      { key: "apple_wallet", label: "Apple Wallet" },
                      { key: "google_wallet", label: "Google Wallet" },
                      { key: "push_notifications", label: "Push Notifications" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <Label htmlFor={`opt-${key}`}>{label}</Label>
                      <Switch
                        id={`opt-${key}`}
                        checked={options[key]}
                        onCheckedChange={() => toggleOption(key)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Program restriction */}
            {activePlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Restrict to Programs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Leave all unchecked to make this card available to all
                    programs.
                  </p>
                  <div className="space-y-2">
                    {activePlans.map((plan) => (
                      <div key={plan.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`plan-${plan.id}`}
                          checked={restrictedPlanIds.has(plan.id)}
                          onCheckedChange={() =>
                            togglePlanRestriction(plan.id)
                          }
                        />
                        <Label htmlFor={`plan-${plan.id}`}>{plan.name}</Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Save button + error */}
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && isEdit && (
          <p className="text-sm text-green-600">Card saved.</p>
        )}
        <Button
          type="button"
          disabled={pending || !name.trim()}
          onClick={handleSave}
        >
          {pending
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create Card"}
        </Button>
      </div>

      {/* Right: Preview (sticky) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <CardPreview
          side={previewSide}
          onSideChange={setPreviewSide}
          frontFields={frontFields}
          backFields={backFields}
          fontColor={fontColor}
          accentColor={accentColor}
          backgroundColor={backgroundColor}
          frontImageUrl={frontImageUrl}
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
