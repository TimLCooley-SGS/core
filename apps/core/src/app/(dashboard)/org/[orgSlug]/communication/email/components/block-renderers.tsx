"use client";

import { useCallback } from "react";
import { Lock, ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@sgscore/ui";
import type {
  EmailBlock,
  EmailBlockProps,
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

interface BlockRendererProps {
  block: EmailBlock;
  onUpdate: (props: Partial<EmailBlockProps>) => void;
}

function InlineEditable({
  value,
  onChange,
  tag: Tag = "span",
  className = "",
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  tag?: "span" | "h1" | "h2" | "p";
  className?: string;
  style?: React.CSSProperties;
}) {
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      const text = e.currentTarget.textContent ?? "";
      if (text !== value) onChange(text);
    },
    [value, onChange],
  );

  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 -mx-1 ${className}`}
      style={style}
    >
      {value}
    </Tag>
  );
}

function HeaderRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as HeaderBlockProps;
  return (
    <div
      className="flex flex-col items-center py-6 px-8"
      style={{
        backgroundColor: props.backgroundColor || "#4E2C70",
        textAlign: (props.alignment || "center") as "left" | "center" | "right",
      }}
    >
      {props.logoUrl ? (
        <img
          src={props.logoUrl}
          alt={props.logoAlt || ""}
          style={{ width: props.logoWidth || 150, maxWidth: "100%", marginBottom: 12 }}
        />
      ) : (
        <div className="w-[150px] h-[40px] rounded bg-white/20 flex items-center justify-center mb-3">
          <ImageIcon className="h-5 w-5 text-white/50" />
        </div>
      )}
      <InlineEditable
        value={props.title || "Your Company"}
        onChange={(text) => onUpdate({ ...props, title: text })}
        tag="h1"
        style={{
          color: props.textColor || "#ffffff",
          fontSize: 24,
          fontWeight: 700,
          margin: 0,
        }}
      />
    </div>
  );
}

function HeadingRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as HeadingBlockProps;
  const Tag = props.level === "h2" ? "h2" : "h1";
  return (
    <div className="px-8 py-4" style={{ textAlign: (props.alignment || "left") as "left" | "center" | "right" }}>
      <InlineEditable
        value={props.text || "Heading"}
        onChange={(text) => onUpdate({ ...props, text })}
        tag={Tag as "h1" | "h2"}
        style={{
          color: props.color || "#111111",
          fontSize: props.level === "h2" ? 20 : 28,
          fontWeight: 700,
          margin: 0,
        }}
      />
    </div>
  );
}

function TextRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as TextBlockProps;
  return (
    <div
      className="px-8 py-2"
      style={{ textAlign: (props.alignment || "left") as "left" | "center" | "right" }}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const html = e.currentTarget.innerHTML;
          if (html !== props.html) onUpdate({ ...props, html });
        }}
        className="outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 -mx-1 min-h-[1.6em] text-base leading-relaxed"
        style={{ color: props.color || "#374151" }}
        dangerouslySetInnerHTML={{ __html: props.html || "Start writing..." }}
      />
    </div>
  );
}

function ImageRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as ImageBlockProps;
  if (!props.src) {
    return (
      <div
        className="px-8 py-4"
        style={{ textAlign: (props.alignment || "center") as "left" | "center" | "right" }}
      >
        <label className="inline-flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg w-full h-[160px] cursor-pointer hover:border-primary/50 transition-colors">
          <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground">Click to add image URL</span>
          <input
            type="text"
            className="sr-only"
            placeholder="Image URL"
            onBlur={(e) => {
              if (e.target.value) onUpdate({ ...props, src: e.target.value });
            }}
          />
        </label>
      </div>
    );
  }
  return (
    <div
      className="px-8 py-4"
      style={{ textAlign: (props.alignment || "center") as "left" | "center" | "right" }}
    >
      <img
        src={props.src}
        alt={props.alt || ""}
        style={{ maxWidth: props.width || "100%", width: "100%", height: "auto", display: "inline-block" }}
      />
    </div>
  );
}

function ButtonRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as ButtonBlockProps;
  return (
    <div
      className="px-8 py-4"
      style={{ textAlign: (props.alignment || "center") as "left" | "center" | "right" }}
    >
      <span
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const text = e.currentTarget.textContent ?? "";
          if (text !== props.text) onUpdate({ ...props, text });
        }}
        className="inline-block outline-none cursor-text"
        style={{
          backgroundColor: props.backgroundColor || "#4E2C70",
          color: props.textColor || "#ffffff",
          padding: "12px 28px",
          borderRadius: props.borderRadius ?? 6,
          fontWeight: 600,
          fontSize: 16,
          width: props.fullWidth ? "100%" : undefined,
          textAlign: "center",
        }}
      >
        {props.text || "Click me"}
      </span>
    </div>
  );
}

function DividerRenderer({ block }: BlockRendererProps) {
  const props = block.props as DividerBlockProps;
  return (
    <div className="px-8" style={{ padding: `${props.padding ?? 16}px 32px` }}>
      <hr
        style={{
          border: "none",
          borderTop: `${props.thickness ?? 1}px ${props.style || "solid"} ${props.color || "#e5e7eb"}`,
          margin: 0,
        }}
      />
    </div>
  );
}

function SpacerRenderer({ block }: BlockRendererProps) {
  const props = block.props as SpacerBlockProps;
  return (
    <div
      className="mx-8 border border-dashed border-muted-foreground/20 flex items-center justify-center"
      style={{ height: props.height ?? 32 }}
    >
      <span className="text-xs text-muted-foreground/50">{props.height ?? 32}px</span>
    </div>
  );
}

function ColumnsRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as ColumnsBlockProps;
  const cols = props.columns || [{ html: "" }, { html: "" }];
  const ratio = props.ratio || "50-50";
  const parts = ratio.split("-").map(Number);
  const total = parts.reduce((a, b) => a + b, 0);

  return (
    <div className="px-8 py-4 flex" style={{ gap: props.gap ?? 16 }}>
      {parts.map((part, i) => (
        <div
          key={i}
          className="border border-dashed border-muted-foreground/20 rounded p-3 min-h-[60px]"
          style={{ flex: `${part} 0 ${Math.round((part / total) * 100)}%` }}
        >
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const html = e.currentTarget.innerHTML;
              const updated = [...cols];
              updated[i] = { html };
              onUpdate({ ...props, columns: updated });
            }}
            className="outline-none text-sm min-h-[1.5em]"
            dangerouslySetInnerHTML={{ __html: cols[i]?.html || `Column ${i + 1}` }}
          />
        </div>
      ))}
    </div>
  );
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "FB",
  twitter: "X",
  instagram: "IG",
  linkedin: "LI",
  youtube: "YT",
  website: "Web",
};

function SocialRenderer({ block }: BlockRendererProps) {
  const props = block.props as SocialBlockProps;
  const links = props.links || [];
  return (
    <div
      className="px-8 py-4 flex gap-3 flex-wrap"
      style={{ justifyContent: props.alignment === "left" ? "flex-start" : props.alignment === "right" ? "flex-end" : "center" }}
    >
      {links.length === 0 ? (
        <span className="text-sm text-muted-foreground">Add social links in the properties panel</span>
      ) : (
        links.map((link, i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium text-xs"
            style={{ width: props.iconSize || 32, height: props.iconSize || 32 }}
          >
            {SOCIAL_LABELS[link.platform] || "?"}
          </span>
        ))
      )}
    </div>
  );
}

function FooterRenderer({ block, onUpdate }: BlockRendererProps) {
  const props = block.props as FooterBlockProps;
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="py-6 px-8 text-center"
        style={{
          backgroundColor: props.backgroundColor || "#f9fafb",
          textAlign: (props.alignment || "center") as "left" | "center" | "right",
        }}
      >
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const html = e.currentTarget.innerHTML;
            if (html !== props.html) onUpdate({ ...props, html });
          }}
          className="text-sm outline-none focus:ring-1 focus:ring-primary/50 rounded mb-2 min-h-[1.5em]"
          style={{ color: props.color || "#6b7280", fontSize: 13, lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{
            __html:
              props.html ||
              `<strong>${props.companyName || "Your Company"}</strong><br/>${props.address || "123 Main St, City, State 12345"}`,
          }}
        />
        <div className="mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs underline cursor-default" style={{ color: props.color || "#6b7280" }}>
                <Lock className="h-3 w-3" />
                Unsubscribe
              </span>
            </TooltipTrigger>
            <TooltipContent>Required by law (CAN-SPAM)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function BlockRenderer({ block, onUpdate }: BlockRendererProps) {
  switch (block.type) {
    case "header":
      return <HeaderRenderer block={block} onUpdate={onUpdate} />;
    case "heading":
      return <HeadingRenderer block={block} onUpdate={onUpdate} />;
    case "text":
      return <TextRenderer block={block} onUpdate={onUpdate} />;
    case "image":
      return <ImageRenderer block={block} onUpdate={onUpdate} />;
    case "button":
      return <ButtonRenderer block={block} onUpdate={onUpdate} />;
    case "divider":
      return <DividerRenderer block={block} onUpdate={onUpdate} />;
    case "spacer":
      return <SpacerRenderer block={block} onUpdate={onUpdate} />;
    case "columns":
      return <ColumnsRenderer block={block} onUpdate={onUpdate} />;
    case "social":
      return <SocialRenderer block={block} onUpdate={onUpdate} />;
    case "footer":
      return <FooterRenderer block={block} onUpdate={onUpdate} />;
    default:
      return <div className="p-4 text-sm text-muted-foreground">Unknown block type</div>;
  }
}
