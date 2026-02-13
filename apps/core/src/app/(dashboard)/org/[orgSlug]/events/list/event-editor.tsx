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
import Link from "next/link";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import type {
  Event,
  EventSchedule,
  EventRecurrenceRule,
  EventPriceType,
  EventType,
  RecurrenceFrequency,
  SellingChannels,
  DeliveryFormats,
  EventEmailSettings,
  Location,
} from "@sgscore/types/tenant";
import { ImageCropper } from "@/components/image-cropper";
import {
  createEvent,
  updateEvent,
  uploadEventBanner,
  removeEventBanner,
  uploadEventSquare,
  removeEventSquare,
} from "./actions";
import { ScheduleBuilder } from "./schedule-builder";

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
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          isOpen
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            isComplete
              ? "bg-primary text-primary-foreground"
              : isOpen
                ? "bg-white text-primary"
                : "bg-primary text-primary-foreground",
          )}
        >
          {isComplete ? <Check className="h-4 w-4" /> : step}
        </span>
        <span className="flex-1 text-sm font-medium">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "text-primary-foreground rotate-180" : "text-primary",
          )}
        />
      </button>
      {isOpen && <div className="px-4 pb-4 pt-4 space-y-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Price Type Row
// ---------------------------------------------------------------------------

interface PriceTypeRow {
  name: string;
  price: string;
  tax_rate: string;
  capacity: string;
}

function defaultPriceRow(): PriceTypeRow {
  return { name: "", price: "", tax_rate: "", capacity: "" };
}

function centsToDollars(cents: number | null): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toString();
}

function dollarsToCents(val: string): number | null {
  if (!val) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : Math.round(num * 100);
}

function rateToPercent(rate: number): string {
  if (!rate) return "";
  return (rate * 100).toString();
}

function percentToRate(val: string): number {
  if (!val) return 0;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num / 100;
}

function computeFees(basePrice: number) {
  const ccFee = basePrice * 0.03;
  const svcFee = basePrice * 0.03;
  return { ccFee, svcFee, total: basePrice + ccFee + svcFee };
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EventEditorProps {
  orgSlug: string;
  locations: Location[];
  event?: Event;
  schedules?: EventSchedule[];
  recurrenceRule?: EventRecurrenceRule;
  priceTypes?: EventPriceType[];
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

const DEFAULT_EMAIL: EventEmailSettings = {
  confirmation: true,
  reminder_1day: true,
  reminder_1hour: true,
  followup: true,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventEditor({
  orgSlug,
  locations,
  event,
  schedules: existingSchedules,
  recurrenceRule: existingRule,
  priceTypes: existingPriceTypes,
}: EventEditorProps) {
  const router = useRouter();
  const isEdit = !!event;

  // Active step
  const [openStep, setOpenStep] = useState(1);
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(
    () => new Set(isEdit ? [1, 2, 3, 4, 5] : [1]),
  );

  function openStepAndTouch(step: number) {
    setTouchedSteps((prev) => {
      if (prev.has(step)) return prev;
      const next = new Set(prev);
      next.add(step);
      return next;
    });
    setOpenStep(step);
  }

  // ─── Step 1: Event Details ────────────────────────────────────────────
  const [eventType, setEventType] = useState<EventType>(
    event?.event_type ?? "single",
  );
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [description, setDescription] = useState(event?.description ?? "");
  const [locationId, setLocationId] = useState(event?.location_id ?? "");
  const [enableCheckIn, setEnableCheckIn] = useState(event?.enable_check_in ?? true);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(
    event?.banner_image_url ?? null,
  );
  const [squareImageUrl, setSquareImageUrl] = useState<string | null>(
    event?.square_image_url ?? null,
  );

  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null);
  const [pendingBannerPreview, setPendingBannerPreview] = useState<string | null>(null);
  const [pendingSquareFile, setPendingSquareFile] = useState<File | null>(null);
  const [pendingSquarePreview, setPendingSquarePreview] = useState<string | null>(null);

  // Auto-slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(nameToSlug(name));
    }
  }, [name, slugEdited]);

  // ─── Step 2: Schedule ─────────────────────────────────────────────────
  const [date, setDate] = useState(() => {
    if (existingSchedules?.length === 1 && event?.event_type === "single") {
      return existingSchedules[0].date;
    }
    return "";
  });
  const [startDate, setStartDate] = useState(() => {
    if (existingRule?.start_date) return existingRule.start_date;
    if (existingSchedules?.length && event?.event_type === "multi_day") {
      return existingSchedules[0].date;
    }
    return "";
  });
  const [endDate, setEndDate] = useState(() => {
    if (existingRule?.end_date) return existingRule.end_date;
    if (existingSchedules?.length && event?.event_type === "multi_day") {
      return existingSchedules[existingSchedules.length - 1].date;
    }
    return "";
  });
  const [startTime, setStartTime] = useState(() => {
    if (existingSchedules?.[0]?.start_time) return existingSchedules[0].start_time;
    if (existingRule?.start_time) return existingRule.start_time ?? "";
    return "";
  });
  const [endTime, setEndTime] = useState(() => {
    if (existingSchedules?.[0]?.end_time) return existingSchedules[0].end_time;
    if (existingRule?.end_time) return existingRule.end_time ?? "";
    return "";
  });
  const [isAllDay, setIsAllDay] = useState(existingSchedules?.[0]?.is_all_day ?? false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    existingRule?.frequency ?? "weekly",
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existingRule?.days_of_week ?? [],
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    existingRule?.end_date ?? "",
  );
  const [occurrenceCount, setOccurrenceCount] = useState(
    existingRule?.occurrence_count?.toString() ?? "",
  );
  const [endCondition, setEndCondition] = useState<"date" | "count">(
    existingRule?.occurrence_count ? "count" : "date",
  );

  // ─── Step 3: Pricing & Capacity ───────────────────────────────────────
  const [isFree, setIsFree] = useState(event?.is_free ?? true);
  const [capacity, setCapacity] = useState(event?.capacity?.toString() ?? "");
  const [priceRows, setPriceRows] = useState<PriceTypeRow[]>(() => {
    if (existingPriceTypes && existingPriceTypes.length > 0) {
      return existingPriceTypes.map((pt) => ({
        name: pt.name,
        price: centsToDollars(pt.price_cents),
        tax_rate: rateToPercent(pt.tax_rate),
        capacity: pt.capacity?.toString() ?? "",
      }));
    }
    return [defaultPriceRow()];
  });

  // ─── Step 4: Delivery & Notifications ─────────────────────────────────
  const [sellingChannels, setSellingChannels] = useState<SellingChannels>(
    event?.selling_channels ?? DEFAULT_SELLING,
  );
  const [deliveryFormats, setDeliveryFormats] = useState<DeliveryFormats>(
    event?.delivery_formats ?? DEFAULT_DELIVERY,
  );
  const [emailSettings, setEmailSettings] = useState<EventEmailSettings>(
    event?.email_settings ?? DEFAULT_EMAIL,
  );

  // ─── Form actions ─────────────────────────────────────────────────────
  const action = isEdit ? updateEvent : createEvent;
  const [state, formAction, pending] = useActionState(action, {});

  // Banner upload
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerUploadState, bannerUploadAction] = useActionState(uploadEventBanner, {});
  const [bannerRemoveState, bannerRemoveAction] = useActionState(removeEventBanner, {});
  const [isUploadingBanner, startBannerUpload] = useTransition();
  const [isRemovingBanner, startBannerRemove] = useTransition();
  const [bannerCropperOpen, setBannerCropperOpen] = useState(false);
  const [bannerCropperSrc, setBannerCropperSrc] = useState<string | null>(null);

  // Square upload
  const squareInputRef = useRef<HTMLInputElement>(null);
  const [squareUploadState, squareUploadAction] = useActionState(uploadEventSquare, {});
  const [squareRemoveState, squareRemoveAction] = useActionState(removeEventSquare, {});
  const [isUploadingSquare, startSquareUpload] = useTransition();
  const [isRemovingSquare, startSquareRemove] = useTransition();
  const [squareCropperOpen, setSquareCropperOpen] = useState(false);
  const [squareCropperSrc, setSquareCropperSrc] = useState<string | null>(null);

  // Redirect on successful create
  useEffect(() => {
    if (state.success && state.eventId && !isEdit) {
      router.push(`/org/${orgSlug}/events/list/${state.eventId}`);
    }
  }, [state.success, state.eventId, isEdit, orgSlug, router]);

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

  useEffect(() => {
    if (state.error) {
      openStepAndTouch(5);
      setTimeout(() => {
        document.getElementById("event-save-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.error]);

  useEffect(() => {
    return () => {
      if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
      if (pendingSquarePreview) URL.revokeObjectURL(pendingSquarePreview);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Step Completion ──────────────────────────────────────────────────
  const step1Complete = touchedSteps.has(1) && !!name.trim() && !!slug.trim() && openStep !== 1;
  const step2Complete = touchedSteps.has(2) && (
    (eventType === "single" && !!date) ||
    (eventType === "multi_day" && !!startDate && !!endDate) ||
    (eventType === "recurring" && !!startDate && !!frequency)
  ) && openStep !== 2;
  const step3Complete = touchedSteps.has(3) && (isFree || priceRows.every((r) => r.name.trim())) && openStep !== 3;
  const step4Complete = touchedSteps.has(4) && openStep !== 4;

  // ─── Image Handlers ───────────────────────────────────────────────────
  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBannerCropperSrc(reader.result as string);
      setBannerCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleBannerCropComplete(croppedFile: File) {
    setBannerCropperOpen(false);
    setBannerCropperSrc(null);
    if (isEdit && event) {
      const fd = new FormData();
      fd.append("orgSlug", orgSlug);
      fd.append("eventId", event.id);
      fd.append("file", croppedFile);
      startBannerUpload(() => bannerUploadAction(fd));
    } else {
      setPendingBannerFile(croppedFile);
      if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
      setPendingBannerPreview(URL.createObjectURL(croppedFile));
    }
  }

  function handleRemoveBanner() {
    if (isEdit && event) {
      const fd = new FormData();
      fd.append("orgSlug", orgSlug);
      fd.append("eventId", event.id);
      startBannerRemove(() => bannerRemoveAction(fd));
    } else {
      setPendingBannerFile(null);
      if (pendingBannerPreview) URL.revokeObjectURL(pendingBannerPreview);
      setPendingBannerPreview(null);
    }
  }

  function handleSquareFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSquareCropperSrc(reader.result as string);
      setSquareCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSquareCropComplete(croppedFile: File) {
    setSquareCropperOpen(false);
    setSquareCropperSrc(null);
    if (isEdit && event) {
      const fd = new FormData();
      fd.append("orgSlug", orgSlug);
      fd.append("eventId", event.id);
      fd.append("file", croppedFile);
      startSquareUpload(() => squareUploadAction(fd));
    } else {
      setPendingSquareFile(croppedFile);
      if (pendingSquarePreview) URL.revokeObjectURL(pendingSquarePreview);
      setPendingSquarePreview(URL.createObjectURL(croppedFile));
    }
  }

  function handleRemoveSquare() {
    if (isEdit && event) {
      const fd = new FormData();
      fd.append("orgSlug", orgSlug);
      fd.append("eventId", event.id);
      startSquareRemove(() => squareRemoveAction(fd));
    } else {
      setPendingSquareFile(null);
      if (pendingSquarePreview) URL.revokeObjectURL(pendingSquarePreview);
      setPendingSquarePreview(null);
    }
  }

  // ─── Price Row Helpers ────────────────────────────────────────────────
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

  // ─── Save Handler ─────────────────────────────────────────────────────
  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (event) fd.append("eventId", event.id);
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("description", description);
    fd.append("eventType", eventType);
    fd.append("locationId", locationId);
    fd.append("capacity", capacity);
    fd.append("isFree", isFree.toString());
    fd.append("registrationRequired", "true");
    fd.append("enableCheckIn", enableCheckIn.toString());
    fd.append("sellingChannels", JSON.stringify(sellingChannels));
    fd.append("deliveryFormats", JSON.stringify(deliveryFormats));
    fd.append("emailSettings", JSON.stringify(emailSettings));

    // Schedule fields
    fd.append("date", date);
    fd.append("startDate", startDate);
    fd.append("endDate", endDate);
    fd.append("startTime", startTime);
    fd.append("endTime", endTime);
    fd.append("isAllDay", isAllDay.toString());
    fd.append("frequency", frequency);
    fd.append("daysOfWeek", JSON.stringify(daysOfWeek));
    fd.append("recurrenceEndDate", recurrenceEndDate);
    fd.append("occurrenceCount", occurrenceCount);

    // Price types
    if (!isFree) {
      const serializedPrices = priceRows.map((row) => ({
        name: row.name,
        price_cents: dollarsToCents(row.price) ?? 0,
        tax_rate: percentToRate(row.tax_rate),
        capacity: row.capacity ? parseInt(row.capacity, 10) || null : null,
      }));
      fd.append("priceTypes", JSON.stringify(serializedPrices));
    }

    if (pendingBannerFile) fd.append("bannerFile", pendingBannerFile);
    if (pendingSquareFile) fd.append("squareFile", pendingSquareFile);

    formAction(fd);
  }

  const eventTypeLabel: Record<EventType, string> = {
    single: "Single Day",
    multi_day: "Multi-Day",
    recurring: "Recurring",
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {/* ─── Step 1: Event Details ─────────────────────────────────────── */}
      <AccordionStep
        step={1}
        title="Event Details"
        isOpen={openStep === 1}
        isComplete={step1Complete}
        onToggle={() => openStepAndTouch(openStep === 1 ? 0 : 1)}
      >
        {/* Event Type */}
        <div className="space-y-2">
          <Label>Event Type *</Label>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { value: "single", label: "Single Day", desc: "One date, one occurrence" },
                { value: "multi_day", label: "Multi-Day", desc: "Consecutive dates" },
                { value: "recurring", label: "Recurring", desc: "Repeating schedule" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEventType(opt.value)}
                className={cn(
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  eventType === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className={cn("text-xs mt-1", eventType === opt.value ? "text-primary-foreground/80" : "text-muted-foreground")}>{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="eventName">Event Name *</Label>
          <Input
            id="eventName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Art Workshop"
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="eventSlug">URL Slug *</Label>
          <Input
            id="eventSlug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
            placeholder="summer-art-workshop"
          />
          <p className="text-xs text-muted-foreground">
            Used in the public URL: /{slug}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="eventDesc">Description</Label>
          <textarea
            id="eventDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Describe this event..."
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

        {/* Enable Check-in */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="enableCheckIn"
            checked={enableCheckIn}
            onCheckedChange={(checked) => setEnableCheckIn(checked === true)}
          />
          <Label htmlFor="enableCheckIn">Enable check-in for this event</Label>
        </div>

        {/* Banner Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Banner Image (16:9)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(bannerImageUrl || pendingBannerPreview) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerImageUrl ?? pendingBannerPreview!}
                alt="Event banner"
                className="max-w-[300px] rounded-md border"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Recommended: 1200x675px. Max 2 MB. PNG, JPG, WebP, or SVG.
            </p>
            {bannerUploadState.error && (
              <p className="text-sm text-destructive">{bannerUploadState.error}</p>
            )}
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
              {(bannerImageUrl || pendingBannerPreview) && (
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
          </CardContent>
        </Card>

        {/* Square Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Square Image (1:1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(squareImageUrl || pendingSquarePreview) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={squareImageUrl ?? pendingSquarePreview!}
                alt="Event square"
                className="max-w-[150px] rounded-md border"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Recommended: 600x600px. Max 2 MB. PNG, JPG, WebP, or SVG.
            </p>
            {squareUploadState.error && (
              <p className="text-sm text-destructive">{squareUploadState.error}</p>
            )}
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
              {(squareImageUrl || pendingSquarePreview) && (
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
          </CardContent>
        </Card>

        <Button
          type="button"
          size="sm"
          onClick={() => openStepAndTouch(2)}
          disabled={!name.trim() || !slug.trim()}
        >
          Continue to Schedule
        </Button>
      </AccordionStep>

      {/* ─── Step 2: Schedule ──────────────────────────────────────────── */}
      <AccordionStep
        step={2}
        title="Schedule"
        isOpen={openStep === 2}
        isComplete={step2Complete}
        onToggle={() => openStepAndTouch(openStep === 2 ? 0 : 2)}
      >
        <ScheduleBuilder
          eventType={eventType}
          date={date}
          setDate={setDate}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          isAllDay={isAllDay}
          setIsAllDay={setIsAllDay}
          frequency={frequency}
          setFrequency={setFrequency}
          daysOfWeek={daysOfWeek}
          setDaysOfWeek={setDaysOfWeek}
          recurrenceEndDate={recurrenceEndDate}
          setRecurrenceEndDate={setRecurrenceEndDate}
          occurrenceCount={occurrenceCount}
          setOccurrenceCount={setOccurrenceCount}
          endCondition={endCondition}
          setEndCondition={setEndCondition}
        />

        <Button type="button" size="sm" onClick={() => openStepAndTouch(3)}>
          Continue to Pricing
        </Button>
      </AccordionStep>

      {/* ─── Step 3: Pricing & Capacity ────────────────────────────────── */}
      <AccordionStep
        step={3}
        title="Pricing & Capacity"
        isOpen={openStep === 3}
        isComplete={step3Complete}
        onToggle={() => openStepAndTouch(openStep === 3 ? 0 : 3)}
      >
        {/* Free toggle */}
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="isFree">Free Event</Label>
          <Switch
            id="isFree"
            checked={isFree}
            onCheckedChange={(checked) => setIsFree(checked === true)}
          />
        </div>

        {/* Price Types (if paid) */}
        {!isFree && (
          <div className="space-y-3">
            <div className="flex gap-6 text-sm text-muted-foreground">
              <span>CC Processing: 3%</span>
              <span>Service Fee: 3%</span>
            </div>
            <Label>Price Tiers</Label>

            <div className="flex items-end gap-2 text-xs text-muted-foreground">
              <span className="w-40 shrink-0">Name</span>
              <span className="w-24 shrink-0">Price ($)</span>
              <span className="w-16 shrink-0">Tax %</span>
              <span className="w-24 shrink-0">Capacity</span>
              <span className="w-16 shrink-0">CC Fee</span>
              <span className="w-16 shrink-0">Svc Fee</span>
              <span className="w-16 shrink-0">Total</span>
              <span className="w-7 shrink-0" />
            </div>

            {priceRows.map((row, idx) => {
              const price = parseFloat(row.price);
              const valid = !isNaN(price) && price > 0;
              const fees = valid ? computeFees(price) : null;

              return (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    className="w-40 shrink-0"
                    value={row.name}
                    onChange={(e) => updatePriceRow(idx, { name: e.target.value })}
                    placeholder="e.g. General"
                  />
                  <Input
                    className="w-24 shrink-0"
                    value={row.price}
                    onChange={(e) => updatePriceRow(idx, { price: e.target.value })}
                    placeholder="0.00"
                  />
                  <Input
                    className="w-16 shrink-0"
                    value={row.tax_rate}
                    onChange={(e) => updatePriceRow(idx, { tax_rate: e.target.value })}
                    placeholder="0"
                  />
                  <Input
                    className="w-24 shrink-0"
                    value={row.capacity}
                    onChange={(e) => updatePriceRow(idx, { capacity: e.target.value })}
                    placeholder="No limit"
                  />
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">
                    {fees ? `$${fees.ccFee.toFixed(2)}` : "\u2014"}
                  </span>
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">
                    {fees ? `$${fees.svcFee.toFixed(2)}` : "\u2014"}
                  </span>
                  <span className="w-16 shrink-0 text-xs font-medium">
                    {fees ? `$${fees.total.toFixed(2)}` : "\u2014"}
                  </span>
                  {priceRows.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removePriceRow(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <span className="w-7 shrink-0" />
                  )}
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addPriceRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Price Tier
            </Button>
          </div>
        )}

        {/* Overall Capacity */}
        <div className="space-y-2">
          <Label htmlFor="eventCapacity">Overall Event Capacity</Label>
          <Input
            id="eventCapacity"
            type="number"
            min="1"
            className="w-32"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="No limit"
          />
          <p className="text-xs text-muted-foreground">
            Maximum registrations per occurrence. Leave blank for unlimited.
          </p>
        </div>

        <Button type="button" size="sm" onClick={() => openStepAndTouch(4)}>
          Continue to Delivery
        </Button>
      </AccordionStep>

      {/* ─── Step 4: Delivery & Notifications ──────────────────────────── */}
      <AccordionStep
        step={4}
        title="Delivery & Notifications"
        isOpen={openStep === 4}
        isComplete={step4Complete}
        onToggle={() => openStepAndTouch(openStep === 4 ? 0 : 4)}
      >
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { key: "confirmation" as const, label: "Registration confirmation" },
                { key: "reminder_1day" as const, label: "Reminder (1 day before)" },
                { key: "reminder_1hour" as const, label: "Reminder (1 hour before)" },
                { key: "followup" as const, label: "Post-event follow-up" },
              ]
            ).map(({ key, label }) => (
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
            ))}
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
              <div key={key} className="flex items-center gap-2">
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
              <div key={key} className="flex items-center gap-2">
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

        <Button type="button" size="sm" onClick={() => openStepAndTouch(5)}>
          Continue to Review
        </Button>
      </AccordionStep>

      {/* ─── Step 5: Review & Create ───────────────────────────────────── */}
      <AccordionStep
        step={5}
        title="Review & Create"
        isOpen={openStep === 5}
        isComplete={false}
        onToggle={() => openStepAndTouch(openStep === 5 ? 0 : 5)}
      >
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{name || "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium">{eventTypeLabel[eventType]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Slug</span>
                <p className="font-medium">{slug || "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Pricing</span>
                <p className="font-medium">
                  {isFree ? "Free" : `${priceRows.length} tier(s)`}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Capacity</span>
                <p className="font-medium">{capacity || "Unlimited"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Check-in</span>
                <p className="font-medium">{enableCheckIn ? "Enabled" : "Disabled"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="font-medium">
                  {locations.find((l) => l.id === locationId)?.name || "None"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="font-medium">
                  {isEdit ? (event?.status ?? "draft") : "Draft"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {state.error && (
          <p id="event-save-error" className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && isEdit && (
          <p className="text-sm text-green-600">Event saved.</p>
        )}

        <Button
          type="button"
          disabled={pending || !name.trim() || !slug.trim()}
          onClick={handleSave}
        >
          {pending
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create Event"}
        </Button>
      </AccordionStep>

      {/* ─── Image Cropper Dialogs ─────────────────────────────────────── */}
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
