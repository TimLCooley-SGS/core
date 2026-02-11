"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
} from "@sgscore/ui";
import { Plus, Filter, Users } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { useTenantRealtime } from "@/hooks/use-tenant-realtime";
import { useRouter } from "next/navigation";
import type { ListOverviewRow } from "../actions";

interface ListsOverviewProps {
  lists: ListOverviewRow[];
}

export function ListsOverview({ lists }: ListsOverviewProps) {
  const { org } = useOrg();
  const router = useRouter();

  // Refresh on changes to persons or list members
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useTenantRealtime("persons", refresh);
  useTenantRealtime("contact_list_members", refresh);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lists</h1>
          <p className="text-sm text-muted-foreground">
            Create smart or static lists to segment your contacts.
          </p>
        </div>
        <Link href={`/org/${org.slug}/contacts/lists/new`}>
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            New List
          </Button>
        </Link>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No lists yet. Create your first list to start segmenting contacts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/org/${org.slug}/contacts/lists/${list.id}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{list.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs shrink-0">
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
                </CardHeader>
                <CardContent>
                  {list.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {list.description}
                    </p>
                  )}
                  <p className="text-sm font-medium">
                    {list.member_count}{" "}
                    {list.member_count === 1 ? "contact" : "contacts"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
