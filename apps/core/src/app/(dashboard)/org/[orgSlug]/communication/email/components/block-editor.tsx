"use client";

import { Input, Label, Button } from "@sgscore/ui";
import { AlignLeft, AlignCenter, AlignRight, Plus, Trash2, Braces } from "lucide-react";
import { VariablePicker } from "./variable-picker";
import type {
  EmailBlock,
  EmailBlockProps,
  EmailTemplateSettings,
  HeaderBlockProps,
  HeadingBlockProps,
  TextBlockProps,
  ImageBlockProps,
  ButtonBlockProps,
  DividerBlockProps,
  SpacerBlockProps,
  ColumnsBlockProps,
  SocialBlockProps,
  FooterBlockProps,
} from "@sgscore/types";

interface BlockEditorProps {
  block: EmailBlock | null;
  settings: EmailTemplateSettings;
  onUpdateBlock: (props: EmailBlockProps) => void;
  onUpdateSettings: (settings: Partial<EmailTemplateSettings>) => void;
  onInsertVariable?: (variableKey: string) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded border cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-9 text-xs font-mono"
        />
      </div>
    </Field>
  );
}

function AlignmentToggle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "left" | "center" | "right") => void;
}) {
  return (
    <Field label="Alignment">
      <div className="flex rounded-md border">
        {(["left", "center", "right"] as const).map((align) => {
          const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
          return (
            <Button
              key={align}
              type="button"
              variant="ghost"
              size="icon"
              className={`h-9 w-9 border-0 first:rounded-r-none last:rounded-l-none [&:not(:first-child):not(:last-child)]:rounded-none ${
                value === align ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""
              }`}
              onClick={() => onChange(align)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    </Field>
  );
}

function SettingsEditor({
  settings,
  onUpdate,
}: {
  settings: EmailTemplateSettings;
  onUpdate: (s: Partial<EmailTemplateSettings>) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Email Settings</h3>
      <p className="text-xs text-muted-foreground">
        Click a block to edit its properties.
      </p>
      <ColorField
        label="Background Color"
        value={settings.backgroundColor}
        onChange={(v) => onUpdate({ backgroundColor: v })}
      />
      <Field label="Content Width (px)">
        <Input
          type="number"
          min={400}
          max={800}
          value={settings.contentWidth}
          onChange={(e) => onUpdate({ contentWidth: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <Field label="Font Family">
        <select
          value={settings.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
          <option value="Verdana, sans-serif">Verdana</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
        </select>
      </Field>
    </div>
  );
}

function HeaderEditor({
  props,
  onUpdate,
}: {
  props: HeaderBlockProps;
  onUpdate: (p: HeaderBlockProps) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Header</h3>
      <Field label="Title">
        <Input
          value={props.title || ""}
          onChange={(e) => onUpdate({ ...props, title: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Logo URL">
        <Input
          value={props.logoUrl || ""}
          onChange={(e) => onUpdate({ ...props, logoUrl: e.target.value })}
          placeholder="https://..."
          className="h-9"
        />
      </Field>
      <Field label="Logo Width (px)">
        <Input
          type="number"
          min={50}
          max={400}
          value={props.logoWidth || 150}
          onChange={(e) => onUpdate({ ...props, logoWidth: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <ColorField
        label="Background"
        value={props.backgroundColor || "#4E2C70"}
        onChange={(v) => onUpdate({ ...props, backgroundColor: v })}
      />
      <ColorField
        label="Text Color"
        value={props.textColor || "#ffffff"}
        onChange={(v) => onUpdate({ ...props, textColor: v })}
      />
      <AlignmentToggle
        value={props.alignment || "center"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
    </div>
  );
}

function HeadingEditor({
  props,
  onUpdate,
  onInsertVariable,
}: {
  props: HeadingBlockProps;
  onUpdate: (p: HeadingBlockProps) => void;
  onInsertVariable?: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Heading</h3>
        {onInsertVariable && (
          <VariablePicker onInsert={onInsertVariable} />
        )}
      </div>
      <Field label="Text">
        <Input
          value={props.text || ""}
          onChange={(e) => onUpdate({ ...props, text: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Level">
        <select
          value={props.level || "h1"}
          onChange={(e) => onUpdate({ ...props, level: e.target.value as "h1" | "h2" })}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="h1">Heading 1 (Large)</option>
          <option value="h2">Heading 2 (Medium)</option>
        </select>
      </Field>
      <ColorField
        label="Color"
        value={props.color || "#111111"}
        onChange={(v) => onUpdate({ ...props, color: v })}
      />
      <AlignmentToggle
        value={props.alignment || "left"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
    </div>
  );
}

function TextEditor({
  props,
  onUpdate,
  onInsertVariable,
}: {
  props: TextBlockProps;
  onUpdate: (p: TextBlockProps) => void;
  onInsertVariable?: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Text</h3>
        {onInsertVariable && (
          <VariablePicker onInsert={onInsertVariable} />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Edit text directly on the canvas.
      </p>
      <ColorField
        label="Text Color"
        value={props.color || "#374151"}
        onChange={(v) => onUpdate({ ...props, color: v })}
      />
      <AlignmentToggle
        value={props.alignment || "left"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
    </div>
  );
}

function ImageEditor({
  props,
  onUpdate,
}: {
  props: ImageBlockProps;
  onUpdate: (p: ImageBlockProps) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Image</h3>
      <Field label="Image URL">
        <Input
          value={props.src || ""}
          onChange={(e) => onUpdate({ ...props, src: e.target.value })}
          placeholder="https://..."
          className="h-9"
        />
      </Field>
      <Field label="Alt Text">
        <Input
          value={props.alt || ""}
          onChange={(e) => onUpdate({ ...props, alt: e.target.value })}
          placeholder="Describe this image"
          className="h-9"
        />
      </Field>
      <Field label="Link URL (optional)">
        <Input
          value={props.href || ""}
          onChange={(e) => onUpdate({ ...props, href: e.target.value })}
          placeholder="https://..."
          className="h-9"
        />
      </Field>
      <Field label="Width (px)">
        <Input
          type="number"
          min={50}
          max={600}
          value={props.width || 536}
          onChange={(e) => onUpdate({ ...props, width: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <AlignmentToggle
        value={props.alignment || "center"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
    </div>
  );
}

function ButtonEditor({
  props,
  onUpdate,
  onInsertVariable,
}: {
  props: ButtonBlockProps;
  onUpdate: (p: ButtonBlockProps) => void;
  onInsertVariable?: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Button</h3>
        {onInsertVariable && (
          <VariablePicker onInsert={onInsertVariable} />
        )}
      </div>
      <Field label="Button Text">
        <Input
          value={props.text || ""}
          onChange={(e) => onUpdate({ ...props, text: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Link URL">
        <Input
          value={props.href || ""}
          onChange={(e) => onUpdate({ ...props, href: e.target.value })}
          placeholder="https://..."
          className="h-9"
        />
      </Field>
      <ColorField
        label="Background"
        value={props.backgroundColor || "#4E2C70"}
        onChange={(v) => onUpdate({ ...props, backgroundColor: v })}
      />
      <ColorField
        label="Text Color"
        value={props.textColor || "#ffffff"}
        onChange={(v) => onUpdate({ ...props, textColor: v })}
      />
      <Field label="Corner Roundness (px)">
        <Input
          type="number"
          min={0}
          max={50}
          value={props.borderRadius ?? 6}
          onChange={(e) => onUpdate({ ...props, borderRadius: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <Field label="Full Width">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={props.fullWidth || false}
            onChange={(e) => onUpdate({ ...props, fullWidth: e.target.checked })}
            className="rounded"
          />
          Stretch to full width
        </label>
      </Field>
      <AlignmentToggle
        value={props.alignment || "center"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
    </div>
  );
}

function DividerEditor({
  props,
  onUpdate,
}: {
  props: DividerBlockProps;
  onUpdate: (p: DividerBlockProps) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Divider</h3>
      <ColorField
        label="Line Color"
        value={props.color || "#e5e7eb"}
        onChange={(v) => onUpdate({ ...props, color: v })}
      />
      <Field label="Thickness (px)">
        <Input
          type="number"
          min={1}
          max={10}
          value={props.thickness ?? 1}
          onChange={(e) => onUpdate({ ...props, thickness: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <Field label="Style">
        <select
          value={props.style || "solid"}
          onChange={(e) => onUpdate({ ...props, style: e.target.value as "solid" | "dashed" | "dotted" })}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </Field>
      <Field label="Spacing (px)">
        <Input
          type="number"
          min={0}
          max={64}
          value={props.padding ?? 16}
          onChange={(e) => onUpdate({ ...props, padding: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
    </div>
  );
}

function SpacerEditor({
  props,
  onUpdate,
}: {
  props: SpacerBlockProps;
  onUpdate: (p: SpacerBlockProps) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Spacer</h3>
      <Field label="Height (px)">
        <input
          type="range"
          min={8}
          max={120}
          value={props.height ?? 32}
          onChange={(e) => onUpdate({ ...props, height: Number(e.target.value) })}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground text-right">{props.height ?? 32}px</p>
      </Field>
    </div>
  );
}

function ColumnsEditor({
  props,
  onUpdate,
}: {
  props: ColumnsBlockProps;
  onUpdate: (p: ColumnsBlockProps) => void;
}) {
  const ratios = [
    { value: "50-50", label: "50 / 50" },
    { value: "33-67", label: "33 / 67" },
    { value: "67-33", label: "67 / 33" },
    { value: "33-33-33", label: "33 / 33 / 33" },
  ] as const;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Columns</h3>
      <Field label="Layout">
        <div className="grid grid-cols-2 gap-2">
          {ratios.map((r) => (
            <Button
              key={r.value}
              type="button"
              variant={props.ratio === r.value ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => {
                const colCount = r.value.split("-").length;
                const cols = [...(props.columns || [])];
                while (cols.length < colCount) cols.push({ html: "" });
                onUpdate({ ...props, ratio: r.value, columns: cols.slice(0, colCount) });
              }}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="Column Gap (px)">
        <Input
          type="number"
          min={0}
          max={48}
          value={props.gap ?? 16}
          onChange={(e) => onUpdate({ ...props, gap: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Edit column content directly on the canvas.
      </p>
    </div>
  );
}

const SOCIAL_PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website" },
] as const;

function SocialEditor({
  props,
  onUpdate,
}: {
  props: SocialBlockProps;
  onUpdate: (p: SocialBlockProps) => void;
}) {
  const links = props.links || [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Social Links</h3>
      <Field label="Icon Size (px)">
        <Input
          type="number"
          min={16}
          max={48}
          value={props.iconSize || 32}
          onChange={(e) => onUpdate({ ...props, iconSize: Number(e.target.value) })}
          className="h-9"
        />
      </Field>
      <AlignmentToggle
        value={props.alignment || "center"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className="space-y-1.5 rounded-md border p-2">
            <div className="flex items-center justify-between">
              <select
                value={link.platform}
                onChange={(e) => {
                  const updated = [...links];
                  updated[i] = { ...link, platform: e.target.value as typeof link.platform };
                  onUpdate({ ...props, links: updated });
                }}
                className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const updated = links.filter((_, j) => j !== i);
                  onUpdate({ ...props, links: updated });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              value={link.url}
              onChange={(e) => {
                const updated = [...links];
                updated[i] = { ...link, url: e.target.value };
                onUpdate({ ...props, links: updated });
              }}
              placeholder="https://..."
              className="h-8 text-xs"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={() => {
          onUpdate({
            ...props,
            links: [...links, { platform: "facebook", url: "" }],
          });
        }}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Link
      </Button>
    </div>
  );
}

function FooterEditor({
  props,
  onUpdate,
}: {
  props: FooterBlockProps;
  onUpdate: (p: FooterBlockProps) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Footer</h3>
      <Field label="Company Name">
        <Input
          value={props.companyName || ""}
          onChange={(e) => onUpdate({ ...props, companyName: e.target.value })}
          className="h-9"
        />
      </Field>
      <Field label="Physical Address">
        <Input
          value={props.address || ""}
          onChange={(e) => onUpdate({ ...props, address: e.target.value })}
          placeholder="123 Main St, City, State 12345"
          className="h-9"
        />
      </Field>
      <ColorField
        label="Text Color"
        value={props.color || "#6b7280"}
        onChange={(v) => onUpdate({ ...props, color: v })}
      />
      <ColorField
        label="Background"
        value={props.backgroundColor || "#f9fafb"}
        onChange={(v) => onUpdate({ ...props, backgroundColor: v })}
      />
      <AlignmentToggle
        value={props.alignment || "center"}
        onChange={(v) => onUpdate({ ...props, alignment: v })}
      />
      <p className="text-xs text-muted-foreground">
        The unsubscribe link is required by CAN-SPAM law and cannot be removed.
      </p>
    </div>
  );
}

export function BlockEditor({
  block,
  settings,
  onUpdateBlock,
  onUpdateSettings,
  onInsertVariable,
}: BlockEditorProps) {
  if (!block) {
    return (
      <div className="w-72 shrink-0 border-l bg-muted/30 p-4 overflow-y-auto">
        <SettingsEditor settings={settings} onUpdate={onUpdateSettings} />
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 border-l bg-muted/30 p-4 overflow-y-auto">
      {block.type === "header" && (
        <HeaderEditor props={block.props as HeaderBlockProps} onUpdate={onUpdateBlock} />
      )}
      {block.type === "heading" && (
        <HeadingEditor props={block.props as HeadingBlockProps} onUpdate={onUpdateBlock} onInsertVariable={onInsertVariable} />
      )}
      {block.type === "text" && (
        <TextEditor props={block.props as TextBlockProps} onUpdate={onUpdateBlock} onInsertVariable={onInsertVariable} />
      )}
      {block.type === "image" && (
        <ImageEditor props={block.props as ImageBlockProps} onUpdate={onUpdateBlock} />
      )}
      {block.type === "button" && (
        <ButtonEditor props={block.props as ButtonBlockProps} onUpdate={onUpdateBlock} onInsertVariable={onInsertVariable} />
      )}
      {block.type === "divider" && (
        <DividerEditor props={block.props as DividerBlockProps} onUpdate={onUpdateBlock} />
      )}
      {block.type === "spacer" && (
        <SpacerEditor props={block.props as SpacerBlockProps} onUpdate={onUpdateBlock} />
      )}
      {block.type === "columns" && (
        <ColumnsEditor props={block.props as ColumnsBlockProps} onUpdate={onUpdateBlock} />
      )}
      {block.type === "social" && (
        <SocialEditor props={block.props as SocialBlockProps} onUpdate={onUpdateBlock} />
      )}
      {block.type === "footer" && (
        <FooterEditor props={block.props as FooterBlockProps} onUpdate={onUpdateBlock} />
      )}
    </div>
  );
}
