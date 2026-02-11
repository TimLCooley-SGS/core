"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Badge } from "@sgscore/ui";
import { Plus } from "lucide-react";
import type { FilterRules, FilterCondition, FilterLogic, Tag } from "@sgscore/types";
import { FilterRow } from "./filter-row";
import { getSmartListCount } from "../actions";
import { useOrg } from "@/components/org-provider";

interface FilterBuilderProps {
  initialRules?: FilterRules;
  tags: Tag[];
  onChange: (rules: FilterRules) => void;
  onTagsChange?: (tags: Tag[]) => void;
}

export function FilterBuilder({
  initialRules,
  tags,
  onChange,
  onTagsChange,
}: FilterBuilderProps) {
  const { org } = useOrg();
  const [logic, setLogic] = useState<FilterLogic>(
    initialRules?.logic ?? "and",
  );
  const [conditions, setConditions] = useState<FilterCondition[]>(
    initialRules?.conditions ?? [],
  );
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  const rules: FilterRules = { logic, conditions };

  // Debounced count
  useEffect(() => {
    const timer = setTimeout(() => {
      setCounting(true);
      getSmartListCount(org.slug, rules).then((result) => {
        setLiveCount(result.count);
        setCounting(false);
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug, logic, JSON.stringify(conditions)]);

  // Notify parent
  useEffect(() => {
    onChange(rules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logic, JSON.stringify(conditions)]);

  function addCondition() {
    setConditions([
      ...conditions,
      { field: "status", op: "eq", value: "active" },
    ]);
  }

  function updateCondition(index: number, cond: FilterCondition) {
    const next = [...conditions];
    next[index] = cond;
    setConditions(next);
  }

  function removeCondition(index: number) {
    setConditions(conditions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Match</span>
        <div className="flex rounded-md border overflow-hidden">
          <button
            type="button"
            className={`px-3 py-1 text-sm transition-colors ${
              logic === "and"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setLogic("and")}
          >
            All
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-sm transition-colors ${
              logic === "or"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setLogic("or")}
          >
            Any
          </button>
        </div>
        <span className="text-sm text-muted-foreground">of the following</span>
        <Badge variant="secondary" className="ml-auto">
          {counting ? "..." : liveCount ?? 0} contacts
        </Badge>
      </div>

      <div className="space-y-2">
        {conditions.map((cond, i) => (
          <FilterRow
            key={i}
            condition={cond}
            tags={tags}
            onUpdate={(c) => updateCondition(i, c)}
            onRemove={() => removeCondition(i)}
            onTagsChange={onTagsChange}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={addCondition}
      >
        <Plus className="h-3.5 w-3.5" />
        Add condition
      </Button>
    </div>
  );
}
