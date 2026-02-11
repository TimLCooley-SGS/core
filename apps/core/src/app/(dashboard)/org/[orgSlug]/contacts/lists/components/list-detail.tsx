"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@sgscore/ui";
import { Pencil, Trash2, Filter, Users, ArrowLeft } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { useTenantRealtime } from "@/hooks/use-tenant-realtime";
import { deleteList, removeStaticMember, type ListMemberRow } from "../actions";
import type { ContactList, FilterCondition } from "@sgscore/types";

interface ListDetailProps {
  list: ContactList;
  members: ListMemberRow[];
}

function conditionSummary(cond: FilterCondition): string {
  const val = Array.isArray(cond.value)
    ? `[${cond.value.length} items]`
    : cond.value === null
      ? ""
      : String(cond.value);
  return `${cond.field} ${cond.op} ${val}`.trim();
}

export function ListDetail({ list, members: initialMembers }: ListDetailProps) {
  const { org } = useOrg();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Auto-refresh via realtime
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useTenantRealtime("persons", refresh);
  useTenantRealtime("person_tags", refresh);
  useTenantRealtime("contact_list_members", refresh);

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this list?")) return;
    startTransition(async () => {
      await deleteList(org.slug, list.id);
      router.push(`/org/${org.slug}/contacts/lists`);
    });
  }

  function handleRemoveMember(personId: string) {
    startTransition(async () => {
      await removeStaticMember(org.slug, list.id, personId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/org/${org.slug}/contacts/lists`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-semibold">{list.name}</h1>
            <Badge variant="secondary" className="text-xs">
              {list.type === "smart" ? (
                <>
                  <Filter className="h-3 w-3 mr-1" />
                  Smart
                </>
              ) : (
                <>
                  <Users className="h-3 w-3 mr-1" />
                  Static
                </>
              )}
            </Badge>
          </div>
          {list.description && (
            <p className="text-sm text-muted-foreground">{list.description}</p>
          )}
          <p className="text-sm">
            {initialMembers.length}{" "}
            {initialMembers.length === 1 ? "contact" : "contacts"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/org/${org.slug}/contacts/lists/${list.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Filter summary for smart lists */}
      {list.type === "smart" && list.filter_rules && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filter Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {list.filter_rules.logic === "and" ? "Match ALL" : "Match ANY"}
              </Badge>
              {list.filter_rules.conditions.map((cond, i) => (
                <Badge key={i} variant="outline">
                  {conditionSummary(cond)}
                </Badge>
              ))}
              {list.filter_rules.conditions.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No filters — includes all contacts
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          {initialMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No contacts match this list.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  {list.type === "static" && (
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground w-20" />
                  )}
                </tr>
              </thead>
              <tbody>
                {initialMembers.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/org/${org.slug}/contacts/people/${member.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {member.first_name} {member.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {member.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {member.status}
                      </Badge>
                    </td>
                    {list.type === "static" && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
