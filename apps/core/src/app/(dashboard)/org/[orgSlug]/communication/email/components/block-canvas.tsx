"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus } from "lucide-react";
import {
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@sgscore/ui";
import type { EmailBlock, EmailBlockProps, EmailBlockType } from "@sgscore/types";
import { BlockRenderer } from "./block-renderers";

interface BlockCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (oldIndex: number, newIndex: number) => void;
  onRemove: (id: string) => void;
  onUpdateProps: (id: string, props: Partial<EmailBlockProps>) => void;
  onInsertAt: (index: number, type: EmailBlockType) => void;
}

function SortableBlock({
  block,
  isSelected,
  isFooter,
  onSelect,
  onRemove,
  onUpdateProps,
}: {
  block: EmailBlock;
  isSelected: boolean;
  isFooter: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onUpdateProps: (props: Partial<EmailBlockProps>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    disabled: isFooter,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? "ring-2 ring-primary rounded" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Drag handle */}
      {!isFooter && (
        <div
          className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      {/* Delete button */}
      {!isFooter && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive z-10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete block</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Block content */}
      <BlockRenderer block={block} onUpdate={onUpdateProps} />
    </div>
  );
}

function InsertButton({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative h-2 -my-1 group/insert"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {visible && (
        <div className="absolute inset-x-0 flex items-center justify-center z-10">
          <div className="h-px flex-1 bg-primary/30" />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground shrink-0"
                  onClick={onClick}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add block here</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="h-px flex-1 bg-primary/30" />
        </div>
      )}
    </div>
  );
}

export function BlockCanvas({
  blocks,
  selectedBlockId,
  onSelect,
  onMove,
  onRemove,
  onUpdateProps,
  onInsertAt,
}: BlockCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onMove(oldIndex, newIndex);
      }
    },
    [blocks, onMove],
  );

  // Separate sortable blocks from the footer
  const footerIndex = blocks.findIndex((b) => b.type === "footer");
  const sortableBlocks = footerIndex >= 0 ? blocks.slice(0, footerIndex) : blocks;
  const footerBlock = footerIndex >= 0 ? blocks[footerIndex] : null;

  const [insertIndex, setInsertIndex] = useState<number | null>(null);

  return (
    <div
      className="flex-1 overflow-y-auto bg-muted/50 p-8"
      onClick={() => onSelect(null)}
    >
      <div className="mx-auto" style={{ maxWidth: 600 + 80 }}>
        <div
          className="mx-10 bg-white rounded-lg shadow-sm overflow-hidden"
          style={{ maxWidth: 600 }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableBlocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortableBlocks.map((block, index) => (
                <div key={block.id}>
                  <InsertButton
                    onClick={() => onInsertAt(index, "text")}
                  />
                  <SortableBlock
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    isFooter={false}
                    onSelect={() => onSelect(block.id)}
                    onRemove={() => onRemove(block.id)}
                    onUpdateProps={(props) => onUpdateProps(block.id, props)}
                  />
                </div>
              ))}
              {/* Insert before footer */}
              <InsertButton
                onClick={() => onInsertAt(sortableBlocks.length, "text")}
              />
            </SortableContext>
          </DndContext>

          {/* Footer — not sortable, always last */}
          {footerBlock && (
            <div
              className={`relative ${selectedBlockId === footerBlock.id ? "ring-2 ring-primary rounded" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(footerBlock.id);
              }}
            >
              <BlockRenderer
                block={footerBlock}
                onUpdate={(props) => onUpdateProps(footerBlock.id, props)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
