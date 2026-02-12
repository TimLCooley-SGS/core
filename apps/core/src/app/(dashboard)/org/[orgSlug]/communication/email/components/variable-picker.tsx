"use client";

import { useState } from "react";
import { Input, Popover, PopoverTrigger, PopoverContent, Button } from "@sgscore/ui";
import { Braces, ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  EMAIL_VARIABLE_CATALOG,
  getVariablesByCategory,
  type EmailVariable,
} from "@sgscore/types";

interface VariablePickerProps {
  onInsert: (variableKey: string) => void;
}

export function VariablePicker({ onInsert }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Contact"]),
  );

  const categorized = getVariablesByCategory();
  const categoryOrder = ["Contact", "Ticket", "Membership", "Donation", "Organization", "System"];

  const filteredByCategory: Record<string, EmailVariable[]> = {};
  if (search) {
    const lower = search.toLowerCase();
    for (const v of EMAIL_VARIABLE_CATALOG) {
      if (
        v.key.toLowerCase().includes(lower) ||
        v.label.toLowerCase().includes(lower) ||
        v.category.toLowerCase().includes(lower)
      ) {
        if (!filteredByCategory[v.category]) filteredByCategory[v.category] = [];
        filteredByCategory[v.category].push(v);
      }
    }
  }

  const displayCategories = search ? filteredByCategory : categorized;

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleSelect(key: string) {
    onInsert(key);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Braces className="h-4 w-4" />
          Variables
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {categoryOrder
            .filter((cat) => displayCategories[cat]?.length)
            .map((cat) => {
              const isExpanded = search || expandedCategories.has(cat);
              const vars = displayCategories[cat];

              return (
                <div key={cat}>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded"
                    onClick={() => toggleCategory(cat)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    {cat}
                    <span className="ml-auto text-muted-foreground/60">{vars.length}</span>
                  </button>
                  {isExpanded && (
                    <div className="pb-1">
                      {vars.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          className="flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-muted transition-colors rounded ml-1"
                          onClick={() => handleSelect(v.key)}
                        >
                          <span>{v.label}</span>
                          <code className="text-xs text-muted-foreground font-mono">
                            {`{{${v.key}}}`}
                          </code>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          {Object.keys(displayCategories).length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No matching variables found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
