"use client";

import { useState, useRef, useActionState } from "react";
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
} from "@sgscore/ui";
import { StickyNote, Mail, Phone } from "lucide-react";
import { useHasCapability } from "@/components/org-provider";
import type { PersonDetail, HouseholdMemberRow } from "./page";
import { updatePersonField } from "../actions";

interface ContactSidebarProps {
  orgSlug: string;
  person: PersonDetail;
  householdMembers: HouseholdMemberRow[];
  householdPeers: HouseholdMemberRow[];
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

export function ContactSidebar({
  orgSlug,
  person,
  householdMembers,
  householdPeers,
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
