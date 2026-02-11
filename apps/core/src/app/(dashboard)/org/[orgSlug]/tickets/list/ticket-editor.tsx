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
  cn,
} from "@sgscore/ui";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import type {
  TicketType,
  TicketPriceType,
  TicketMode,
  PricingMode,
  PurchaseWindow,
  SellingChannels,
  DeliveryFormats,
  EmailSettings,
  DayPrices,
  Location,
  BlockedDate,
} from "@sgscore/types/tenant";
import { ImageCropper } from "@/components/image-cropper";
import {
  createTicketType,
  updateTicketType,
  uploadTicketBanner,
  removeTicketBanner,
  uploadTicketSquare,
  removeTicketSquare,
} from "./actions";

// ---------------------------------------------------------------------------
// Accordion Step
// ---------------------------------------------------------------------------

function AccordionStep({
  step,
  title,
  isOpen,
  isComplete,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  isOpen: boolean;
  isComplete: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            isComplete
              ? "bg-green-600 text-white"
              : isOpen
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          {isComplete ? <Check className="h-4 w-4" /> : step}
        </span>
        <span className="flex-1 text-sm font-medium">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price Type Row
// ---------------------------------------------------------------------------

interface PriceTypeRow {
  name: string;
  price_cents: number | null;
  day_prices: DayPrices | null;
  target_price_cents: number | null;
  tax_rate: number;
}

const EMPTY_DAY_PRICES: DayPrices = {
  mon: null, tue: null, wed: null, thu: null,
  fri: null, sat: null, sun: null,
};

const DAY_LABELS: { key: keyof DayPrices; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function defaultPriceRow(): PriceTypeRow {
  return {
    name: "",
    price_cents: null,
    day_prices: null,
    target_price_cents: null,
    tax_rate: 0,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TicketEditorProps {
  orgSlug: string;
  locations: Location[];
  blockedDates: BlockedDate[];
  ticket?: TicketType;
  priceTypes?: TicketPriceType[];
}

const DEFAULT_SELLING: SellingChannels = {
  in_person_counter: false,
  in_person_kiosk: false,
  online: false,
};

const DEFAULT_DELIVERY: DeliveryFormats = {
  email: false,
  google_wallet: false,
  apple_wallet: false,
};

const DEFAULT_EMAIL: EmailSettings = {
  post_purchase: true,
  reminder_1day: true,
  reminder_1hour: true,
  day_after: true,
};

const PURCHASE_WINDOW_OPTIONS: { value: PurchaseWindow; label: string }[] = [
  { value: "2_weeks", label: "2 Weeks" },
  { value: "30_days", label: "30 Days" },
  { value: "60_days", label: "60 Days" },
  { value: "90_days", label: "90 Days" },
  { value: "none", label: "No Limit" },
];

const INTERVAL_PRESETS = [15, 30, 45, 60];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TicketEditor({
  orgSlug,
  locations,
  blockedDates,
  ticket,
  priceTypes: existingPriceTypes,
}: TicketEditorProps) {
  const router = useRouter();
  const isEdit = !!ticket;

  // Active step
  const [openStep, setOpenStep] = useState(1);

  // ─── Step 1: Ticket Type ─────────────────────────────────────────────
  const [ticketMode, setTicketMode] = useState<TicketMode>(
    ticket?.ticket_mode ?? "daily_admission",
  );
  const [name, setName] = useState(ticket?.name ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [locationId, setLocationId] = useState(ticket?.location_id ?? "");
  const [tags, setTags] = useState(ticket?.tags?.join(", ") ?? "");
  const [includeTerms, setIncludeTerms] = useState(ticket?.include_terms ?? false);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(
    ticket?.banner_image_url ?? null,
  );
  const [squareImageUrl, setSquareImageUrl] = useState<string | null>(
    ticket?.square_image_url ?? null,
  );

  // ─── Step 2: Pricing ─────────────────────────────────────────────────
  const [pricingMode, setPricingMode] = useState<PricingMode>(
    ticket?.pricing_mode ?? "flat",
  );
  const [priceRows, setPriceRows] = useState<PriceTypeRow[]>(() => {
    if (existingPriceTypes && existingPriceTypes.length > 0) {
      return existingPriceTypes.map((pt) => ({
        name: pt.name,
        price_cents: pt.price_cents,
        day_prices: pt.day_prices,
        target_price_cents: pt.target_price_cents,
        tax_rate: pt.tax_rate,
      }));
    }
    return [defaultPriceRow()];
  });

  // ─── Step 3: Date & Time ─────────────────────────────────────────────
  const [guestAllowance, setGuestAllowance] = useState(
    ticket?.guest_allowance?.toString() ?? "100",
  );
  const [purchaseWindow, setPurchaseWindow] = useState<PurchaseWindow>(
    ticket?.purchase_window ?? "30_days",
  );
  const [timedInterval, setTimedInterval] = useState(
    ticket?.timed_interval_minutes?.toString() ?? "30",
  );
  const [customInterval, setCustomInterval] = useState(false);
  const [entryWindow, setEntryWindow] = useState(
    ticket?.entry_window_minutes?.toString() ?? "15",
  );
  const [newBlockedDates, setNewBlockedDates] = useState<
    { start_date: string; end_date: string; reason: string }[]
  >([]);
  const [bdStartDate, setBdStartDate] = useState("");
  const [bdEndDate, setBdEndDate] = useState("");
  const [bdReason, setBdReason] = useState("");

  // ─── Step 4: Delivery ────────────────────────────────────────────────
  const [sellingChannels, setSellingChannels] = useState<SellingChannels>(
    ticket?.selling_channels ?? DEFAULT_SELLING,
  );
  const [deliveryFormats, setDeliveryFormats] = useState<DeliveryFormats>(
    ticket?.delivery_formats ?? DEFAULT_DELIVERY,
  );
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(
    ticket?.email_settings ?? DEFAULT_EMAIL,
  );

  // ─── Form actions ────────────────────────────────────────────────────
  const action = isEdit ? updateTicketType : createTicketType;
  const [state, formAction, pending] = useActionState(action, {});

  // Banner upload
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerUploadState, bannerUploadAction] = useActionState(uploadTicketBanner, {});
  const [bannerRemoveState, bannerRemoveAction] = useActionState(removeTicketBanner, {});
  const [isUploadingBanner, startBannerUpload] = useTransition();
  const [isRemovingBanner, startBannerRemove] = useTransition();
  const [bannerCropperOpen, setBannerCropperOpen] = useState(false);
  const [bannerCropperSrc, setBannerCropperSrc] = useState<string | null>(null);

  // Square upload
  const squareInputRef = useRef<HTMLInputElement>(null);
  const [squareUploadState, squareUploadAction] = useActionState(uploadTicketSquare, {});
  const [squareRemoveState, squareRemoveAction] = useActionState(removeTicketSquare, {});
  const [isUploadingSquare, startSquareUpload] = useTransition();
  const [isRemovingSquare, startSquareRemove] = useTransition();
  const [squareCropperOpen, setSquareCropperOpen] = useState(false);
  const [squareCropperSrc, setSquareCropperSrc] = useState<string | null>(null);

  // Redirect on successful create
  useEffect(() => {
    if (state.success && state.ticketId && !isEdit) {
      router.push(`/org/${orgSlug}/tickets/list/${state.ticketId}`);
    }
  }, [state.success, state.ticketId, isEdit, orgSlug, router]);

  // Update local image state on successful uploads
  useEffect(() => {
    if (bannerUploadState.success && bannerUploadState.imageUrl) {
      setBannerImageUrl(bannerUploadState.imageUrl);
    }
  }, [bannerUploadState.success, bannerUploadState.imageUrl]);

  useEffect(() => {
    if (bannerRemoveState.success) setBannerImageUrl(null);
  }, [bannerRemoveState.success]);

  useEffect(() => {
    if (squareUploadState.success && squareUploadState.imageUrl) {
      setSquareImageUrl(squareUploadState.imageUrl);
    }
  }, [squareUploadState.success, squareUploadState.imageUrl]);

  useEffect(() => {
    if (squareRemoveState.success) setSquareImageUrl(null);
  }, [squareRemoveState.success]);

  // Set custom interval flag if value doesn't match preset
  useEffect(() => {
    if (ticket?.timed_interval_minutes && !INTERVAL_PRESETS.includes(ticket.timed_interval_minutes)) {
      setCustomInterval(true);
    }
  }, [ticket?.timed_interval_minutes]);

  // ─── Step Completion ─────────────────────────────────────────────────
  const step1Complete = !!name.trim() && !!ticketMode;
  const step2Complete = priceRows.length > 0 && priceRows.every((r) => r.name.trim());
  const step3Complete = parseInt(guestAllowance, 10) > 0;
  const step4Complete = true; // delivery is all optional / placeholder

  // ─── Image Handlers ──────────────────────────────────────────────────
  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBannerCropperSrc(reader.result as string);
      setBannerCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleBannerCropComplete(croppedFile: File) {
    if (!ticket) return;
    setBannerCropperOpen(false);
    setBannerCropperSrc(null);
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", ticket.id);
    fd.append("file", croppedFile);
    startBannerUpload(() => bannerUploadAction(fd));
  }

  function handleRemoveBanner() {
    if (!ticket) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", ticket.id);
    startBannerRemove(() => bannerRemoveAction(fd));
  }

  function handleSquareFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSquareCropperSrc(reader.result as string);
      setSquareCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSquareCropComplete(croppedFile: File) {
    if (!ticket) return;
    setSquareCropperOpen(false);
    setSquareCropperSrc(null);
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", ticket.id);
    fd.append("file", croppedFile);
    startSquareUpload(() => squareUploadAction(fd));
  }

  function handleRemoveSquare() {
    if (!ticket) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("ticketId", ticket.id);
    startSquareRemove(() => squareRemoveAction(fd));
  }

  // ─── Price Row Helpers ───────────────────────────────────────────────
  function addPriceRow() {
    setPriceRows((prev) => [...prev, defaultPriceRow()]);
  }

  function removePriceRow(index: number) {
    setPriceRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePriceRow(index: number, updates: Partial<PriceTypeRow>) {
    setPriceRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  }

  // ─── Blocked Date Helpers ────────────────────────────────────────────
  function addBlockedDate() {
    if (!bdStartDate || !bdEndDate) return;
    setNewBlockedDates((prev) => [
      ...prev,
      { start_date: bdStartDate, end_date: bdEndDate, reason: bdReason },
    ]);
    setBdStartDate("");
    setBdEndDate("");
    setBdReason("");
  }

  function removeNewBlockedDate(index: number) {
    setNewBlockedDates((prev) => prev.filter((_, i) => i !== index));
  }

  // ─── Save Handler ────────────────────────────────────────────────────
  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (ticket) fd.append("ticketId", ticket.id);
    fd.append("name", name);
    fd.append("description", description);
    fd.append("ticketMode", ticketMode);
    fd.append("locationId", locationId);
    fd.append("tags", tags);
    fd.append("includeTerms", includeTerms.toString());
    fd.append("pricingMode", pricingMode);
    fd.append("guestAllowance", guestAllowance);
    fd.append("purchaseWindow", purchaseWindow);
    fd.append("timedIntervalMinutes", ticketMode === "timed_entry" ? timedInterval : "");
    fd.append("entryWindowMinutes", ticketMode === "timed_entry" ? entryWindow : "");
    fd.append("sellingChannels", JSON.stringify(sellingChannels));
    fd.append("deliveryFormats", JSON.stringify(deliveryFormats));
    fd.append("emailSettings", JSON.stringify(emailSettings));
    fd.append("priceTypes", JSON.stringify(priceRows));
    if (newBlockedDates.length > 0) {
      fd.append("newBlockedDates", JSON.stringify(newBlockedDates));
    }

    formAction(fd);
  }

  // Helper for cents input
  function centsToDisplay(cents: number | null): string {
    if (cents === null || cents === undefined) return "";
    return (cents / 100).toFixed(2);
  }

  function displayToCents(val: string): number | null {
    if (!val) return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : Math.round(num * 100);
  }

  // Existing blocked dates for the selected location
  const locationBlockedDates = blockedDates.filter(
    (bd) => !bd.location_id || bd.location_id === locationId,
  );

  return (
    <div className="space-y-4 max-w-3xl">
      {/* ─── Step 1: Ticket Type ──────────────────────────────────────── */}
      <AccordionStep
        step={1}
        title="Ticket Type"
        isOpen={openStep === 1}
        isComplete={step1Complete && openStep !== 1}
        onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
      >
        {/* Mode Selection */}
        <div className="space-y-2">
          <Label>Ticket Mode *</Label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "daily_admission", label: "Daily Admission", desc: "Single entry per day" },
                { value: "timed_entry", label: "Timed Entry", desc: "Specific time slot" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTicketMode(opt.value)}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  ticketMode === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="ticketName">Ticket Name *</Label>
          <Input
            id="ticketName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. General Admission"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="ticketDesc">Description</Label>
          <textarea
            id="ticketDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Describe this ticket type..."
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <select
            id="location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">No location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Comma-separated, e.g. seasonal, weekend"
          />
        </div>

        {/* Banner Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Banner Image (16:9)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bannerImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerImageUrl}
                alt="Ticket banner"
                className="max-w-[300px] rounded-md border"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Recommended: 1200x675px. Max 2 MB. PNG, JPG, WebP, or SVG.
            </p>
            {bannerUploadState.error && (
              <p className="text-sm text-destructive">{bannerUploadState.error}</p>
            )}
            {bannerRemoveState.error && (
              <p className="text-sm text-destructive">{bannerRemoveState.error}</p>
            )}
            {isEdit ? (
              <div className="flex gap-3">
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleBannerFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingBanner}
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {isUploadingBanner ? "Uploading..." : "Upload Banner"}
                </Button>
                {bannerImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRemovingBanner}
                    onClick={handleRemoveBanner}
                  >
                    {isRemovingBanner ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Save the ticket first, then upload images.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Square Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Square Image (1:1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {squareImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={squareImageUrl}
                alt="Ticket square"
                className="max-w-[150px] rounded-md border"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Recommended: 600x600px. Max 2 MB. PNG, JPG, WebP, or SVG.
            </p>
            {squareUploadState.error && (
              <p className="text-sm text-destructive">{squareUploadState.error}</p>
            )}
            {squareRemoveState.error && (
              <p className="text-sm text-destructive">{squareRemoveState.error}</p>
            )}
            {isEdit ? (
              <div className="flex gap-3">
                <input
                  ref={squareInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleSquareFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingSquare}
                  onClick={() => squareInputRef.current?.click()}
                >
                  {isUploadingSquare ? "Uploading..." : "Upload Square"}
                </Button>
                {squareImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRemovingSquare}
                    onClick={handleRemoveSquare}
                  >
                    {isRemovingSquare ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Save the ticket first, then upload images.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Include Terms */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="includeTerms"
            checked={includeTerms}
            onCheckedChange={(checked) => setIncludeTerms(checked === true)}
          />
          <Label htmlFor="includeTerms">Include Terms & Conditions (placeholder)</Label>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setOpenStep(2)}
          disabled={!step1Complete}
        >
          Continue to Pricing
        </Button>
      </AccordionStep>

      {/* ─── Step 2: Pricing ──────────────────────────────────────────── */}
      <AccordionStep
        step={2}
        title="Pricing"
        isOpen={openStep === 2}
        isComplete={step2Complete && openStep !== 2}
        onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
      >
        {/* Read-only fee display */}
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>CC Processing: 3%</span>
          <span>Service Fee: 3%</span>
        </div>

        {/* Pricing Mode */}
        <div className="space-y-2">
          <Label>Pricing Mode</Label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: "flat", label: "Flat", desc: "One price always" },
                { value: "semi_dynamic", label: "Semi Dynamic", desc: "Price varies by day of week" },
                { value: "full_dynamic", label: "Full Dynamic", desc: "AI-optimized pricing" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPricingMode(opt.value)}
                className={cn(
                  "rounded-lg border-2 p-3 text-left transition-colors",
                  pricingMode === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Price Types */}
        <div className="space-y-3">
          <Label>Price Tiers</Label>
          {priceRows.map((row, idx) => (
            <Card key={idx}>
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tier {idx + 1}</span>
                  {priceRows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removePriceRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={row.name}
                      onChange={(e) => updatePriceRow(idx, { name: e.target.value })}
                      placeholder="e.g. Adult, Child, Senior"
                    />
                  </div>

                  {pricingMode === "flat" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={centsToDisplay(row.price_cents)}
                        onChange={(e) =>
                          updatePriceRow(idx, { price_cents: displayToCents(e.target.value) })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {pricingMode === "full_dynamic" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Target Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={centsToDisplay(row.target_price_cents)}
                        onChange={(e) =>
                          updatePriceRow(idx, {
                            target_price_cents: displayToCents(e.target.value),
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                {pricingMode === "semi_dynamic" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Price by Day ($)</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {DAY_LABELS.map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <span className="text-xs text-muted-foreground block text-center">
                            {label}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="text-center text-xs px-1"
                            value={centsToDisplay(row.day_prices?.[key] ?? null)}
                            onChange={(e) => {
                              const dp = { ...(row.day_prices ?? EMPTY_DAY_PRICES) };
                              dp[key] = displayToCents(e.target.value);
                              updatePriceRow(idx, { day_prices: dp });
                            }}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={row.tax_rate ? (row.tax_rate * 100).toFixed(2) : "0"}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value);
                        updatePriceRow(idx, { tax_rate: isNaN(pct) ? 0 : pct / 100 });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CC Fee (3%)</Label>
                    <p className="text-sm text-muted-foreground h-10 flex items-center">
                      {pricingMode === "flat" && row.price_cents
                        ? `$${((row.price_cents * 0.03) / 100).toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Service Fee (3%)</Label>
                    <p className="text-sm text-muted-foreground h-10 flex items-center">
                      {pricingMode === "flat" && row.price_cents
                        ? `$${((row.price_cents * 0.03) / 100).toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addPriceRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Price Tier
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setOpenStep(3)}
          disabled={!step2Complete}
        >
          Continue to Date & Time
        </Button>
      </AccordionStep>

      {/* ─── Step 3: Date & Time ──────────────────────────────────────── */}
      <AccordionStep
        step={3}
        title="Date & Time"
        isOpen={openStep === 3}
        isComplete={step3Complete && openStep !== 3}
        onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
      >
        {/* Guest Allowance */}
        <div className="space-y-2">
          <Label htmlFor="guestAllowance">
            Guest Allowance{" "}
            <span className="text-muted-foreground font-normal">
              ({ticketMode === "timed_entry" ? "per time slot" : "per day"})
            </span>
          </Label>
          <Input
            id="guestAllowance"
            type="number"
            min="1"
            value={guestAllowance}
            onChange={(e) => setGuestAllowance(e.target.value)}
          />
        </div>

        {/* Purchase Window */}
        <div className="space-y-2">
          <Label htmlFor="purchaseWindow">Purchase Window</Label>
          <select
            id="purchaseWindow"
            value={purchaseWindow}
            onChange={(e) => setPurchaseWindow(e.target.value as PurchaseWindow)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {PURCHASE_WINDOW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timed Entry fields */}
        {ticketMode === "timed_entry" && (
          <>
            <div className="space-y-2">
              <Label>Time Slot Interval</Label>
              <div className="flex flex-wrap gap-2">
                {INTERVAL_PRESETS.map((mins) => (
                  <Button
                    key={mins}
                    type="button"
                    variant={
                      !customInterval && timedInterval === mins.toString()
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      setCustomInterval(false);
                      setTimedInterval(mins.toString());
                    }}
                  >
                    {mins} min
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={customInterval ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCustomInterval(true)}
                >
                  Other
                </Button>
              </div>
              {customInterval && (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    min="1"
                    className="w-24"
                    value={timedInterval}
                    onChange={(e) => setTimedInterval(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryWindow">Entry Window (minutes before slot)</Label>
              <Input
                id="entryWindow"
                type="number"
                min="1"
                className="w-32"
                value={entryWindow}
                onChange={(e) => setEntryWindow(e.target.value)}
              />
            </div>
          </>
        )}

        {/* Blocked Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blocked Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {locationBlockedDates.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Existing Blocked Dates</p>
                {locationBlockedDates.map((bd) => (
                  <p key={bd.id} className="text-xs text-muted-foreground">
                    {bd.start_date} — {bd.end_date}: {bd.reason}
                  </p>
                ))}
              </div>
            )}

            {newBlockedDates.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">New Blocked Dates</p>
                {newBlockedDates.map((bd, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span>
                      {bd.start_date} — {bd.end_date}: {bd.reason || "Blocked"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => removeNewBlockedDate(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={bdStartDate}
                  onChange={(e) => setBdStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={bdEndDate}
                  onChange={(e) => setBdEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reason</Label>
                <Input
                  value={bdReason}
                  onChange={(e) => setBdReason(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlockedDate}
              disabled={!bdStartDate || !bdEndDate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Blocked Date
            </Button>
          </CardContent>
        </Card>

        <Button type="button" size="sm" onClick={() => setOpenStep(4)}>
          Continue to Delivery
        </Button>
      </AccordionStep>

      {/* ─── Step 4: Delivery ─────────────────────────────────────────── */}
      <AccordionStep
        step={4}
        title="Delivery"
        isOpen={openStep === 4}
        isComplete={step4Complete && openStep !== 4}
        onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
      >
        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { key: "post_purchase" as const, label: "Post-purchase confirmation", timedOnly: false },
                { key: "reminder_1day" as const, label: "Reminder (1 day before)", timedOnly: false },
                { key: "reminder_1hour" as const, label: "Reminder (1 hour before)", timedOnly: true },
                { key: "day_after" as const, label: "Day-after follow-up", timedOnly: false },
              ]
            ).map(({ key, label, timedOnly }) => {
              if (timedOnly && ticketMode !== "timed_entry") return null;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <Label htmlFor={`email-${key}`}>{label}</Label>
                  <Switch
                    id={`email-${key}`}
                    checked={emailSettings[key]}
                    onCheckedChange={(checked) =>
                      setEmailSettings((prev) => ({ ...prev, [key]: checked === true }))
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Selling Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selling Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { key: "in_person_counter", label: "In-person Counter" },
                { key: "in_person_kiosk", label: "In-person Kiosk" },
                { key: "online", label: "Online" },
              ] as const
            ).map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={`sell-${key}`}
                  checked={sellingChannels[key]}
                  onCheckedChange={(checked) =>
                    setSellingChannels((prev) => ({ ...prev, [key]: checked === true }))
                  }
                />
                <Label htmlFor={`sell-${key}`}>{label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Delivery Formats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Formats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { key: "email", label: "Email" },
                { key: "google_wallet", label: "Google Wallet" },
                { key: "apple_wallet", label: "Apple Wallet" },
              ] as const
            ).map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center gap-2"
              >
                <Checkbox
                  id={`deliver-${key}`}
                  checked={deliveryFormats[key]}
                  onCheckedChange={(checked) =>
                    setDeliveryFormats((prev) => ({ ...prev, [key]: checked === true }))
                  }
                />
                <Label htmlFor={`deliver-${key}`}>{label}</Label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="button" size="sm" onClick={() => setOpenStep(5)}>
          Continue to Review
        </Button>
      </AccordionStep>

      {/* ─── Step 5: Review & Create ──────────────────────────────────── */}
      <AccordionStep
        step={5}
        title="Review & Create"
        isOpen={openStep === 5}
        isComplete={false}
        onToggle={() => setOpenStep(openStep === 5 ? 0 : 5)}
      >
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mode</span>
                <p className="font-medium capitalize">
                  {ticketMode.replace("_", " ")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Pricing</span>
                <p className="font-medium capitalize">
                  {pricingMode.replace("_", " ")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Price Tiers</span>
                <p className="font-medium">{priceRows.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Guest Allowance</span>
                <p className="font-medium">{guestAllowance}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Purchase Window</span>
                <p className="font-medium">
                  {PURCHASE_WINDOW_OPTIONS.find((o) => o.value === purchaseWindow)?.label}
                </p>
              </div>
              {ticketMode === "timed_entry" && (
                <>
                  <div>
                    <span className="text-muted-foreground">Interval</span>
                    <p className="font-medium">{timedInterval} min</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entry Window</span>
                    <p className="font-medium">{entryWindow} min</p>
                  </div>
                </>
              )}
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium">
                  {locations.find((l) => l.id === locationId)?.name || "None"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium">
                  {isEdit ? (ticket?.status ?? "draft") : "Draft"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && isEdit && (
          <p className="text-sm text-green-600">Ticket saved.</p>
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
              : "Create Ticket"}
        </Button>
      </AccordionStep>

      {/* ─── Image Cropper Dialogs ────────────────────────────────────── */}
      {bannerCropperSrc && (
        <ImageCropper
          open={bannerCropperOpen}
          imageSrc={bannerCropperSrc}
          onClose={() => {
            setBannerCropperOpen(false);
            setBannerCropperSrc(null);
          }}
          onCropComplete={handleBannerCropComplete}
          aspect={16 / 9}
          outputWidth={1200}
          outputHeight={675}
          fileName="banner.png"
          title="Crop Banner Image"
        />
      )}
      {squareCropperSrc && (
        <ImageCropper
          open={squareCropperOpen}
          imageSrc={squareCropperSrc}
          onClose={() => {
            setSquareCropperOpen(false);
            setSquareCropperSrc(null);
          }}
          onCropComplete={handleSquareCropComplete}
          aspect={1}
          outputWidth={600}
          outputHeight={600}
          fileName="square.png"
          title="Crop Square Image"
        />
      )}
    </div>
  );
}
