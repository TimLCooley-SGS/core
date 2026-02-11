"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from "@sgscore/ui";
import type {
  TicketDesign,
  TicketDesignFieldConfig,
  TicketDesignFieldKey,
  TicketDesignOptions,
  TicketDesignOptionKey,
} from "@sgscore/types/tenant";
import { RichTextEditor } from "@/components/rich-text-editor";
import { DesignPreview } from "./design-preview";
import { createTicketDesign, updateTicketDesign } from "./actions";

const DEFAULT_FIELD_CONFIG: TicketDesignFieldConfig = {
  guest_name: true,
  date: true,
  time: true,
  barcode: true,
  event_name: true,
  location: true,
  ticket_price: true,
  ticket_number: true,
  order_number: true,
  registrant_name: false,
};

const DEFAULT_OPTIONS: TicketDesignOptions = {
  mobile_pdf: true,
  print_tickets: true,
  download_tickets: true,
  display_tickets_first: false,
  qr_code: false,
};

// Ordered to match ticket preview layout: left panel fields, then right panel
const LEFT_PANEL_FIELDS: { key: TicketDesignFieldKey; label: string }[] = [
  { key: "barcode", label: "Barcode" },
  { key: "order_number", label: "Order Number" },
  { key: "ticket_number", label: "Ticket Number" },
];
const RIGHT_PANEL_FIELDS: { key: TicketDesignFieldKey; label: string }[] = [
  { key: "event_name", label: "Event Name" },
  { key: "guest_name", label: "Guest Name" },
  { key: "location", label: "Location" },
  { key: "date", label: "Date" },
  { key: "time", label: "Time" },
  { key: "ticket_price", label: "Ticket Price" },
  { key: "registrant_name", label: "Registrant Name" },
];

const OPTION_LABELS: Record<TicketDesignOptionKey, string> = {
  mobile_pdf: "Mobile PDF",
  print_tickets: "Print Tickets",
  download_tickets: "Download Tickets",
  display_tickets_first: "Display Tickets First",
  qr_code: "QR Code (instead of barcode)",
};

interface DesignEditorProps {
  orgSlug: string;
  design?: TicketDesign;
}

export function DesignEditor({ orgSlug, design }: DesignEditorProps) {
  const router = useRouter();
  const isEdit = !!design;

  // State
  const [name, setName] = useState(design?.name ?? "");
  const [isDefault, setIsDefault] = useState(design?.is_default ?? false);
  const [fieldConfig, setFieldConfig] = useState<TicketDesignFieldConfig>(
    design?.field_config ?? DEFAULT_FIELD_CONFIG,
  );
  const [options, setOptions] = useState<TicketDesignOptions>(
    design?.options ?? DEFAULT_OPTIONS,
  );
  const [backgroundColor, setBackgroundColor] = useState(
    design?.background_color ?? "#FFF8E1",
  );
  const [fontColor, setFontColor] = useState(
    design?.font_color ?? "#000000",
  );
  const [bodyText, setBodyText] = useState(
    design?.body_text ?? "<h2>Your Tickets</h2><p>Thank you for your purchase!</p>",
  );
  const [termsText, setTermsText] = useState(
    design?.terms_text ?? "<p><strong>TERMS AND CONDITIONS</strong> NO REFUNDS. RESALE IS PROHIBITED.</p>",
  );

  // Form actions
  const action = isEdit ? updateTicketDesign : createTicketDesign;
  const [state, formAction, pending] = useActionState(action, {});

  // Redirect on successful create
  useEffect(() => {
    if (state.success && state.designId && !isEdit) {
      router.push(`/org/${orgSlug}/tickets/designer/${state.designId}`);
    }
  }, [state.success, state.designId, isEdit, orgSlug, router]);

  function toggleField(key: TicketDesignFieldKey) {
    setFieldConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleOption(key: TicketDesignOptionKey) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (design) fd.append("designId", design.id);
    fd.append("name", name);
    fd.append("isDefault", isDefault.toString());
    fd.append("backgroundColor", backgroundColor);
    fd.append("fontColor", fontColor);
    fd.append("bodyText", bodyText);
    fd.append("termsText", termsText);

    for (const key of Object.keys(fieldConfig) as TicketDesignFieldKey[]) {
      fd.append(`field_${key}`, fieldConfig[key].toString());
    }
    for (const key of Object.keys(options) as TicketDesignOptionKey[]) {
      fd.append(`opt_${key}`, options[key].toString());
    }

    formAction(fd);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Editor */}
      <div className="lg:col-span-2 space-y-4">
        {/* Design Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Design Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="designName">Name *</Label>
              <Input
                id="designName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Ticket"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">Set as Default Design</Label>
              <Switch
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ticket Fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Left Panel</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LEFT_PANEL_FIELDS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <Label htmlFor={`field-${key}`}>{label}</Label>
                  <Switch
                    id={`field-${key}`}
                    checked={fieldConfig[key]}
                    onCheckedChange={() => toggleField(key)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Right Panel</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RIGHT_PANEL_FIELDS.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <Label htmlFor={`field-${key}`}>{label}</Label>
                  <Switch
                    id={`field-${key}`}
                    checked={fieldConfig[key]}
                    onCheckedChange={() => toggleField(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(OPTION_LABELS) as TicketDesignOptionKey[]).map(
                (key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <Label htmlFor={`opt-${key}`}>{OPTION_LABELS[key]}</Label>
                    <Switch
                      id={`opt-${key}`}
                      checked={options[key]}
                      onCheckedChange={() => toggleOption(key)}
                    />
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Body Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body Text</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              content={bodyText}
              onChange={setBodyText}
              placeholder="Message shown above the ticket..."
              minHeight="150px"
            />
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              content={termsText}
              onChange={setTermsText}
              placeholder="Terms and conditions text..."
              minHeight="100px"
            />
          </CardContent>
        </Card>

        {/* Save button + feedback */}
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state.success && isEdit && (
          <p className="text-sm text-green-600">Design saved.</p>
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
              : "Create Design"}
        </Button>
      </div>

      {/* Right: Preview (sticky) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <DesignPreview
          fieldConfig={fieldConfig}
          backgroundColor={backgroundColor}
          fontColor={fontColor}
          bodyText={bodyText}
          termsText={termsText}
          qrCode={options.qr_code}
        />
      </div>
    </div>
  );
}
