"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
} from "@sgscore/ui";
import { Plus, Filter, Users, Search, LayoutGrid, List } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Refresh on changes to persons or list members
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useTenantRealtime("persons", refresh);
  useTenantRealtime("contact_list_members", refresh);

  const filtered = useMemo(() => {
    if (!search.trim()) return lists;
    const q = search.toLowerCase();
    return lists.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
    );
  }, [lists, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lists</h1>
          <p className="text-sm text-muted-foreground">
            Create smart or static lists to segment your contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lists.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search lists..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-56"
                />
              </div>
              <div className="flex rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-r-none border-0 h-9 w-9 ${view === "grid" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-l-none border-0 h-9 w-9 ${view === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          <Link href={`/org/${org.slug}/contacts/lists/new`}>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </Link>
        </div>
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
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No lists matching &ldquo;{search}&rdquo;
            </p>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((list) => (
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
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((list) => (
              <Link
                key={list.id}
                href={`/org/${org.slug}/contacts/lists/${list.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium min-w-0 truncate flex-1">
                  {list.name}
                </span>
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
                {list.description && (
                  <span className="text-sm text-muted-foreground truncate hidden md:block max-w-[200px] lg:max-w-xs">
                    {list.description}
                  </span>
                )}
                <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
                  {list.member_count}{" "}
                  {list.member_count === 1 ? "contact" : "contacts"}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
