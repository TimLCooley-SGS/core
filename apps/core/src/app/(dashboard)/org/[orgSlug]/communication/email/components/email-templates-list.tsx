"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sgscore/ui";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Mail,
  MoreVertical,
  Copy,
  Archive,
} from "lucide-react";
import { useOrg } from "@/components/org-provider";
import type { EmailTemplateOverview } from "../actions";
import { duplicateEmailTemplate, deleteEmailTemplate } from "../actions";

interface EmailTemplatesListProps {
  templates: EmailTemplateOverview[];
}

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EmailTemplatesList({ templates }: EmailTemplatesListProps) {
  const { org } = useOrg();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q),
    );
  }, [templates, search]);

  function handleDuplicate(templateId: string) {
    startTransition(async () => {
      await duplicateEmailTemplate(org.slug, templateId);
      router.refresh();
    });
  }

  function handleArchive(templateId: string) {
    startTransition(async () => {
      await deleteEmailTemplate(org.slug, templateId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            Design and manage email templates for newsletters and campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
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
          <Link href={`/org/${org.slug}/communication/email/new`}>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Email
            </Button>
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No email templates yet. Create your first template to get started.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No templates matching &ldquo;{search}&rdquo;
            </p>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card
              key={template.id}
              className="hover:border-primary/50 transition-colors cursor-pointer h-full group relative"
            >
              <Link
                href={`/org/${org.slug}/communication/email/${template.id}`}
                className="block p-6"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-base truncate pr-8">
                    {template.name}
                  </h3>
                </div>
                {template.subject && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.subject}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${statusColors[template.status] ?? ""}`}
                  >
                    {template.status.charAt(0).toUpperCase() +
                      template.status.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(template.updated_at)}
                  </span>
                </div>
              </Link>
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={pending}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(template.id);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchive(template.id);
                      }}
                      className="text-destructive"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((template) => (
              <div key={template.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group">
                <Link
                  href={`/org/${org.slug}/communication/email/${template.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <span className="font-medium min-w-0 truncate flex-1">
                    {template.name}
                  </span>
                  {template.subject && (
                    <span className="text-sm text-muted-foreground truncate hidden md:block max-w-[200px] lg:max-w-xs">
                      {template.subject}
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${statusColors[template.status] ?? ""}`}
                  >
                    {template.status.charAt(0).toUpperCase() +
                      template.status.slice(1)}
                  </Badge>
                  <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
                    {formatDate(template.updated_at)}
                  </span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={pending}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchive(template.id)}
                      className="text-destructive"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
