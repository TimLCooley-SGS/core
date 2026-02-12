"use client";

import {
  LayoutTemplate,
  Heading,
  Type,
  ImageIcon,
  MousePointerClick,
  Minus,
  MoveVertical,
  Columns2,
  Share2,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@sgscore/ui";
import type { EmailBlockType } from "@sgscore/types";

interface BlockPaletteItem {
  type: EmailBlockType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const BLOCK_TYPES: BlockPaletteItem[] = [
  { type: "header", label: "Header", icon: LayoutTemplate, description: "Logo and title banner" },
  { type: "heading", label: "Heading", icon: Heading, description: "Section heading text" },
  { type: "text", label: "Text", icon: Type, description: "Rich text paragraph" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Image with optional link" },
  { type: "button", label: "Button", icon: MousePointerClick, description: "Call-to-action button" },
  { type: "divider", label: "Divider", icon: Minus, description: "Horizontal line separator" },
  { type: "spacer", label: "Spacer", icon: MoveVertical, description: "Adjustable vertical space" },
  { type: "columns", label: "Columns", icon: Columns2, description: "Multi-column layout" },
  { type: "social", label: "Social", icon: Share2, description: "Social media icons" },
];

interface BlockPaletteProps {
  onAdd: (type: EmailBlockType) => void;
}

export function BlockPalette({ onAdd }: BlockPaletteProps) {
  return (
    <div className="w-56 shrink-0 border-r bg-muted/30 p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Add Block
      </h3>
      <TooltipProvider delayDuration={300}>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_TYPES.map((item) => (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onAdd(item.type)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-background p-3 h-[72px] hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-muted-foreground hover:text-primary"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.description}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
