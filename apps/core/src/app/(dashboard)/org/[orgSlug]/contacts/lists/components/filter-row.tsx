"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Button,
} from "@sgscore/ui";
import { X } from "lucide-react";
import type { FilterCondition, Tag } from "@sgscore/types";
import { TagPicker, TagBadges } from "./tag-picker";

const FIELD_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "tags", label: "Tags" },
  { value: "membership_status", label: "Membership" },
  { value: "has_donated", label: "Has donated" },
  { value: "created_after", label: "Created after" },
  { value: "created_before", label: "Created before" },
];

const OPERATOR_MAP: Record<string, { value: string; label: string }[]> = {
  status: [
    { value: "eq", label: "is" },
    { value: "neq", label: "is not" },
  ],
  name: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
  ],
  email: [
    { value: "contains", label: "contains" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  tags: [
    { value: "includes_any", label: "has any of" },
    { value: "includes_all", label: "has all of" },
    { value: "includes_none", label: "has none of" },
  ],
  membership_status: [
    { value: "eq", label: "is" },
    { value: "neq", label: "is not" },
  ],
  has_donated: [
    { value: "eq", label: "is true" },
    { value: "neq", label: "is false" },
  ],
  created_after: [{ value: "gte", label: "after" }],
  created_before: [{ value: "lte", label: "before" }],
};

const NO_VALUE_OPS = ["is_null", "is_not_null"];

interface FilterRowProps {
  condition: FilterCondition;
  tags: Tag[];
  onUpdate: (cond: FilterCondition) => void;
  onRemove: () => void;
  onTagsChange?: (tags: Tag[]) => void;
}

export function FilterRow({
  condition,
  tags,
  onUpdate,
  onRemove,
  onTagsChange,
}: FilterRowProps) {
  const operators = OPERATOR_MAP[condition.field] ?? [];
  const showValue = !NO_VALUE_OPS.includes(condition.op) &&
    condition.field !== "has_donated";

  function handleFieldChange(field: string) {
    const ops = OPERATOR_MAP[field] ?? [];
    const defaultOp = ops[0]?.value ?? "eq";
    onUpdate({ field, op: defaultOp as FilterCondition["op"], value: null });
  }

  function handleOpChange(op: string) {
    onUpdate({ ...condition, op: op as FilterCondition["op"] });
  }

  return (
    <div className="flex items-start gap-2">
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_OPTIONS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={condition.op} onValueChange={handleOpChange}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showValue && condition.field === "status" && (
        <Select
          value={(condition.value as string) ?? "active"}
          onValueChange={(v) => onUpdate({ ...condition, value: v })}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showValue && condition.field === "membership_status" && (
        <Select
          value={(condition.value as string) ?? "active"}
          onValueChange={(v) => onUpdate({ ...condition, value: v })}
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showValue && condition.field === "tags" && (
        <div className="flex-1 space-y-1">
          <TagPicker
            tags={tags}
            selectedIds={
              Array.isArray(condition.value) ? condition.value : []
            }
            onChange={(ids) => onUpdate({ ...condition, value: ids })}
            onTagsChange={onTagsChange}
          />
          <TagBadges
            tags={tags}
            selectedIds={
              Array.isArray(condition.value) ? condition.value : []
            }
          />
        </div>
      )}

      {showValue &&
        (condition.field === "name" || condition.field === "email") && (
          <Input
            placeholder="Value..."
            className="h-9 w-[160px]"
            value={(condition.value as string) ?? ""}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          />
        )}

      {showValue &&
        (condition.field === "created_after" ||
          condition.field === "created_before") && (
          <Input
            type="date"
            className="h-9 w-[160px]"
            value={(condition.value as string) ?? ""}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
          />
        )}

      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0 shrink-0"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
