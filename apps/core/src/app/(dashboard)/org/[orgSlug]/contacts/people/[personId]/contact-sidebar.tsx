"use client";

import { useState, useRef, useActionState, useTransition } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarFallback,
  Button,
  Input,
  Collapsible,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Checkbox,
} from "@sgscore/ui";
import { StickyNote, Mail, Phone, Plus, X } from "lucide-react";
import { useHasCapability, useOrg } from "@/components/org-provider";
import type { PersonDetail, HouseholdMemberRow, PersonTagRow, TagRow } from "./page";
import { updatePersonField, addPersonTag, removePersonTag } from "../actions";

interface ContactSidebarProps {
  orgSlug: string;
  person: PersonDetail;
  householdMembers: HouseholdMemberRow[];
  householdPeers: HouseholdMemberRow[];
  personTags: PersonTagRow[];
  allTags: TagRow[];
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function InlineEditField({
  orgSlug,
  personId,
  field,
  label,
  value,
  type = "text",
  canEdit,
}: {
  orgSlug: string;
  personId: string;
  field: string;
  label: string;
  value: string | null;
  type?: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(updatePersonField, {});

  function handleBlur() {
    formRef.current?.requestSubmit();
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      formRef.current?.requestSubmit();
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {editing ? (
        <form ref={formRef} action={formAction} className="flex-1 ml-3">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="field" value={field} />
          <Input
            name="value"
            type={type}
            defaultValue={value ?? ""}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            autoFocus
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => canEdit && setEditing(true)}
          className={`text-sm text-right truncate max-w-[160px] ${
            canEdit
              ? "cursor-pointer hover:text-primary"
              : "cursor-default"
          }`}
        >
          {value || "—"}
        </button>
      )}
      {state.error && (
        <p className="text-xs text-destructive mt-0.5">{state.error}</p>
      )}
    </div>
  );
}

function StatusField({
  orgSlug,
  personId,
  status,
  canEdit,
}: {
  orgSlug: string;
  personId: string;
  status: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(updatePersonField, {});

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
  };

  function handleChange() {
    formRef.current?.requestSubmit();
    setEditing(false);
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">Status</span>
      {editing ? (
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="field" value="status" />
          <select
            name="value"
            defaultValue={status}
            onChange={handleChange}
            onBlur={() => setEditing(false)}
            className="h-7 rounded-md border border-input bg-background px-2 text-sm"
            autoFocus
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => canEdit && setEditing(true)}
          className={canEdit ? "cursor-pointer" : "cursor-default"}
        >
          <Badge
            variant="secondary"
            className={`${statusColors[status] ?? ""} ${canEdit ? "hover:opacity-80 transition-opacity" : ""}`}
          >
            {status}
          </Badge>
        </button>
      )}
      {state.error && (
        <p className="text-xs text-destructive mt-0.5">{state.error}</p>
      )}
    </div>
  );
}

function TagsSection({
  orgSlug,
  personId,
  personTags,
  allTags,
  canEdit,
}: {
  orgSlug: string;
  personId: string;
  personTags: PersonTagRow[];
  allTags: TagRow[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const tagIds = new Set(personTags.map((pt) => pt.tag.id));
  const available = allTags.filter(
    (t) => !tagIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase()),
  );

  function handleAdd(tagId: string) {
    startTransition(async () => {
      await addPersonTag(orgSlug, personId, tagId);
    });
  }

  function handleRemove(tagId: string) {
    startTransition(async () => {
      await removePersonTag(orgSlug, personId, tagId);
    });
  }

  return (
    <div className="pb-3 space-y-2">
      <div className="flex flex-wrap gap-1">
        {personTags.map((pt) => (
          <Badge
            key={pt.id}
            variant="secondary"
            className="text-xs gap-1 pr-1"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: pt.tag.color }}
            />
            {pt.tag.name}
            {canEdit && (
              <button
                type="button"
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                onClick={() => handleRemove(pt.tag.id)}
                disabled={isPending}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {personTags.length === 0 && !canEdit && (
          <span className="text-sm text-muted-foreground">No tags</span>
        )}
      </div>
      {canEdit && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
              <Plus className="h-3 w-3" />
              Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs mb-2"
            />
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="flex items-center gap-2 w-full px-2 py-1 rounded text-sm hover:bg-muted transition-colors"
                  onClick={() => handleAdd(tag.id)}
                  disabled={isPending}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </button>
              ))}
              {available.length === 0 && (
                <p className="text-xs text-muted-foreground py-1 px-2">
                  {allTags.length === 0
                    ? "No tags created yet."
                    : "All tags assigned."}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function ContactSidebar({
  orgSlug,
  person,
  householdMembers,
  householdPeers,
  personTags,
  allTags,
}: ContactSidebarProps) {
  const canEdit = useHasCapability("people.update");

  // Group peers by household
  const peersByHousehold = new Map<
    string,
    { household: { id: string; name: string | null }; role: string; peers: HouseholdMemberRow[] }
  >();
  for (const hm of householdMembers) {
    const peers = householdPeers.filter(
      (p) => p.household.id === hm.household.id,
    );
    peersByHousehold.set(hm.household.id, {
      household: hm.household,
      role: hm.role,
      peers,
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-1">
        {/* Header: Avatar + Name */}
        <div className="flex flex-col items-center text-center pb-4">
          <Avatar className="h-16 w-16 mb-3">
            <AvatarFallback className="text-lg">
              {getInitials(person.first_name, person.last_name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold">
            {person.first_name} {person.last_name}
          </h2>
          {person.display_name && (
            <p className="text-sm text-muted-foreground">
              {person.display_name}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center gap-2 pb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Coming soon")}
          >
            <StickyNote className="mr-1.5 h-4 w-4" />
            Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Coming soon")}
          >
            <Mail className="mr-1.5 h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Coming soon")}
          >
            <Phone className="mr-1.5 h-4 w-4" />
            Call
          </Button>
        </div>

        {/* About this contact */}
        <Collapsible title="About this contact" defaultOpen>
          <div className="pb-3 space-y-0.5">
            <InlineEditField
              orgSlug={orgSlug}
              personId={person.id}
              field="email"
              label="Email"
              value={person.email}
              type="email"
              canEdit={canEdit}
            />
            <InlineEditField
              orgSlug={orgSlug}
              personId={person.id}
              field="phone"
              label="Phone"
              value={person.phone}
              type="tel"
              canEdit={canEdit}
            />
            <InlineEditField
              orgSlug={orgSlug}
              personId={person.id}
              field="date_of_birth"
              label="DOB"
              value={person.date_of_birth}
              type="date"
              canEdit={canEdit}
            />
            <StatusField
              orgSlug={orgSlug}
              personId={person.id}
              status={person.status}
              canEdit={canEdit}
            />
          </div>
        </Collapsible>

        {/* Tags */}
        <Collapsible title="Tags" defaultOpen>
          <TagsSection
            orgSlug={orgSlug}
            personId={person.id}
            personTags={personTags}
            allTags={allTags}
            canEdit={canEdit}
          />
        </Collapsible>

        {/* Relationships */}
        <Collapsible title="Relationships" defaultOpen>
          <div className="pb-3 space-y-3">
            {peersByHousehold.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not a member of any household.
              </p>
            ) : (
              Array.from(peersByHousehold.values()).map(
                ({ household, role, peers }) => (
                  <div key={household.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {household.name ?? "Unnamed Household"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    </div>
                    {peers.length > 0 ? (
                      <div className="space-y-1.5 pl-1">
                        {peers.map((peer) => (
                          <Link
                            key={peer.id}
                            href={`/org/${orgSlug}/contacts/people/${peer.person.id}`}
                            className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {getInitials(
                                  peer.person.first_name,
                                  peer.person.last_name,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {peer.person.first_name} {peer.person.last_name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-xs ml-auto"
                            >
                              {peer.role}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pl-1">
                        No other members.
                      </p>
                    )}
                  </div>
                ),
              )
            )}
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
