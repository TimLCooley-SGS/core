"use client";

import { useState, useTransition } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Input,
  Badge,
  Checkbox,
} from "@sgscore/ui";
import { Plus } from "lucide-react";
import type { Tag } from "@sgscore/types";
import { createTag } from "../actions";
import { useOrg } from "@/components/org-provider";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

interface TagPickerProps {
  tags: Tag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onTagsChange?: (tags: Tag[]) => void;
}

export function TagPicker({
  tags,
  selectedIds,
  onChange,
  onTagsChange,
}: TagPickerProps) {
  const { org } = useOrg();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [isPending, startTransition] = useTransition();

  const filtered = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createTag(org.slug, newName.trim(), newColor);
      if (result.tag) {
        onTagsChange?.([...tags, result.tag]);
        onChange([...selectedIds, result.tag.id]);
        setNewName("");
        setCreating(false);
      }
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1">
          <Plus className="h-3 w-3" />
          Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 mb-2"
        />
        <div className="max-h-40 overflow-y-auto space-y-1">
          {filtered.map((tag) => (
            <label
              key={tag.id}
              className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={selectedIds.includes(tag.id)}
                onCheckedChange={() => toggle(tag.id)}
              />
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm truncate">{tag.name}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-1 px-1">
              No tags found.
            </p>
          )}
        </div>
        <div className="border-t mt-2 pt-2">
          {creating ? (
            <div className="space-y-2">
              <Input
                placeholder="Tag name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <div className="flex gap-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-5 w-5 rounded-full border-2 transition-colors"
                    style={{
                      backgroundColor: c,
                      borderColor: c === newColor ? "currentColor" : "transparent",
                    }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreate}
                  disabled={isPending || !newName.trim()}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setCreating(true)}
            >
              + Create new tag
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TagBadges({
  tags,
  selectedIds,
}: {
  tags: Tag[];
  selectedIds: string[];
}) {
  const selected = tags.filter((t) => selectedIds.includes(t.id));
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="text-xs gap-1"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
