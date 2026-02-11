"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea, Card, CardContent } from "@sgscore/ui";
import type { Tag, FilterRules, ContactList } from "@sgscore/types";
import { FilterBuilder } from "./filter-builder";
import { StaticMemberPicker } from "./static-member-picker";
import { createList, updateList, addStaticMember, type ListMemberRow } from "../actions";
import { useOrg } from "@/components/org-provider";

interface ListFormProps {
  tags: Tag[];
  existingList?: ContactList;
  existingMembers?: ListMemberRow[];
}

export function ListForm({ tags, existingList, existingMembers }: ListFormProps) {
  const { org } = useOrg();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(existingList?.name ?? "");
  const [description, setDescription] = useState(
    existingList?.description ?? "",
  );
  const [type, setType] = useState<"smart" | "static">(
    existingList?.type ?? "smart",
  );
  const [filterRules, setFilterRules] = useState<FilterRules>(
    existingList?.filter_rules ?? { logic: "and", conditions: [] },
  );
  const [staticMembers, setStaticMembers] = useState<ListMemberRow[]>(
    existingMembers ?? [],
  );
  const [allTags, setAllTags] = useState<Tag[]>(tags);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      if (existingList) {
        // Update
        const result = await updateList(org.slug, existingList.id, {
          name,
          description,
          filter_rules: type === "smart" ? filterRules : undefined,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push(`/org/${org.slug}/contacts/lists/${existingList.id}`);
      } else {
        // Create
        const result = await createList(org.slug, {
          name,
          description,
          type,
          filter_rules: type === "smart" ? filterRules : undefined,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.list && type === "static") {
          // Add static members
          for (const member of staticMembers) {
            await addStaticMember(org.slug, result.list.id, member.id);
          }
        }
        router.push(`/org/${org.slug}/contacts/lists`);
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">List name</Label>
          <Input
            id="name"
            placeholder="e.g. Active Members, VIP Donors..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="What is this list for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Type toggle - only on create */}
        {!existingList && (
          <div className="space-y-2">
            <Label>List type</Label>
            <div className="flex rounded-md border overflow-hidden w-fit">
              <button
                type="button"
                className={`px-4 py-2 text-sm transition-colors ${
                  type === "smart"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setType("smart")}
              >
                Smart List
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm transition-colors ${
                  type === "static"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => setType("static")}
              >
                Static List
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {type === "smart"
                ? "Smart lists auto-populate based on filter rules."
                : "Static lists contain hand-picked contacts."}
            </p>
          </div>
        )}
      </div>

      {/* Builder section */}
      <Card>
        <CardContent className="pt-6">
          {type === "smart" ? (
            <FilterBuilder
              initialRules={filterRules}
              tags={allTags}
              onChange={setFilterRules}
              onTagsChange={setAllTags}
            />
          ) : (
            <StaticMemberPicker
              members={staticMembers}
              onChange={setStaticMembers}
            />
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending
            ? "Saving..."
            : existingList
              ? "Update List"
              : "Create List"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/org/${org.slug}/contacts/lists`)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
