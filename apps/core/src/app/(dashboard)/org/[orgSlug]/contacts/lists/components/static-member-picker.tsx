"use client";

import { useState, useTransition } from "react";
import { Input, Button, Badge } from "@sgscore/ui";
import { Search, X } from "lucide-react";
import { searchContacts, type ListMemberRow } from "../actions";
import { useOrg } from "@/components/org-provider";

interface StaticMemberPickerProps {
  members: ListMemberRow[];
  onChange: (members: ListMemberRow[]) => void;
}

export function StaticMemberPicker({
  members,
  onChange,
}: StaticMemberPickerProps) {
  const { org } = useOrg();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListMemberRow[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const data = await searchContacts(org.slug, query);
      // Filter out already-added members
      const memberIds = new Set(members.map((m) => m.id));
      setResults(data.filter((r) => !memberIds.has(r.id)));
    });
  }

  function addMember(person: ListMemberRow) {
    onChange([...members, person]);
    setResults(results.filter((r) => r.id !== person.id));
  }

  function removeMember(personId: string) {
    onChange(members.filter((m) => m.id !== personId));
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts by name or email..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={isPending}>
          Search
        </Button>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
          {results.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium">
                  {person.first_name} {person.last_name}
                </span>
                {person.email && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {person.email}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => addMember(person)}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Added members table */}
      {members.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Members ({members.length})
          </p>
          <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
            {members.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {person.first_name} {person.last_name}
                  </span>
                  {person.email && (
                    <span className="text-sm text-muted-foreground">
                      {person.email}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {person.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => removeMember(person.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Search for contacts to add to this list.
        </p>
      )}
    </div>
  );
}
