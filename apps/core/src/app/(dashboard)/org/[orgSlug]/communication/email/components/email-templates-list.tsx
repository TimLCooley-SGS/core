"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Trash2,
  Send,
  FolderPlus,
  FolderOpen,
  Folder,
  FolderInput,
  X,
  Users,
  Filter,
  Check,
  Loader2,
} from "lucide-react";
import { useOrg } from "@/components/org-provider";
import type { EmailTemplateOverview, EmailFolder, SendableList } from "../actions";
import {
  duplicateEmailTemplate,
  deleteEmailTemplate,
  moveEmailTemplate,
  createEmailFolder,
  deleteEmailFolder,
  sendEmailToList,
} from "../actions";

interface EmailTemplatesListProps {
  templates: EmailTemplateOverview[];
  folders: EmailFolder[];
  lists: SendableList[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EmailTemplatesList({
  templates,
  folders,
  lists,
}: EmailTemplatesListProps) {
  const { org } = useOrg();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pending, startTransition] = useTransition();
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = all

  // Folder management
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Send to list
  const [sendTemplateId, setSendTemplateId] = useState<string | null>(null);
  const [sendTemplateName, setSendTemplateName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ sent: number; error?: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Filter templates by folder and search
  const filtered = useMemo(() => {
    let result = templates;

    // Folder filter
    if (activeFolder !== null) {
      result = result.filter((t) => t.folder_id === activeFolder);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q),
      );
    }

    return result;
  }, [templates, search, activeFolder]);

  const unfolderedCount = templates.filter((t) => !t.folder_id).length;

  function handleDuplicate(templateId: string) {
    startTransition(async () => {
      await duplicateEmailTemplate(org.slug, templateId);
      router.refresh();
    });
  }

  function handleDelete(templateId: string) {
    startTransition(async () => {
      await deleteEmailTemplate(org.slug, templateId);
      router.refresh();
    });
  }

  function handleMoveToFolder(templateId: string, folderId: string | null) {
    startTransition(async () => {
      await moveEmailTemplate(org.slug, templateId, folderId);
      router.refresh();
    });
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      await createEmailFolder(org.slug, newFolderName);
      setNewFolderName("");
      setShowNewFolder(false);
      router.refresh();
    });
  }

  function handleDeleteFolder(folderId: string) {
    startTransition(async () => {
      await deleteEmailFolder(org.slug, folderId);
      if (activeFolder === folderId) setActiveFolder(null);
      router.refresh();
    });
  }

  function openSendDialog(templateId: string, templateName: string) {
    setSendTemplateId(templateId);
    setSendTemplateName(templateName);
    setSelectedListId(null);
    setSendResult(null);
    setIsSending(false);
  }

  function closeSendDialog() {
    setSendTemplateId(null);
    setSendTemplateName("");
    setSelectedListId(null);
    setSendResult(null);
    setIsSending(false);
  }

  async function handleSend() {
    if (!sendTemplateId || !selectedListId) return;
    setIsSending(true);
    const result = await sendEmailToList(org.slug, sendTemplateId, selectedListId);
    setSendResult(result);
    setIsSending(false);
  }

  const selectedList = lists.find((l) => l.id === selectedListId);

  // Shared dropdown menu items
  function TemplateMenu({
    template,
    align = "end",
  }: {
    template: EmailTemplateOverview;
    align?: "start" | "end";
  }) {
    return (
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
        <DropdownMenuContent align={align}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              openSendDialog(template.id, template.name);
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Send to List
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicate(template.id);
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {/* Move to folder submenu */}
          {folders.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {template.folder_id && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToFolder(template.id, null);
                  }}
                >
                  <FolderInput className="h-4 w-4 mr-2" />
                  Remove from Folder
                </DropdownMenuItem>
              )}
              {folders
                .filter((f) => f.id !== template.folder_id)
                .map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToFolder(template.id, folder.id);
                    }}
                  >
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to {folder.name}
                  </DropdownMenuItem>
                ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(template.id);
            }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
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

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className={`flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeFolder === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span className="flex-1 text-left">All Templates</span>
            <span className="text-xs tabular-nums">{templates.length}</span>
          </button>

          {folders.map((folder) => (
            <div key={folder.id} className="group/folder flex items-center">
              <button
                type="button"
                onClick={() => setActiveFolder(folder.id)}
                className={`flex items-center gap-2 flex-1 min-w-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeFolder === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {activeFolder === folder.id ? (
                  <FolderOpen className="h-4 w-4 shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0" />
                )}
                <span className="flex-1 text-left truncate">{folder.name}</span>
                <span className="text-xs tabular-nums">{folder.template_count}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFolder(folder.id)}
                className="p-1 rounded opacity-0 group-hover/folder:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                disabled={pending}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {showNewFolder ? (
            <div className="flex items-center gap-1 px-1">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || pending}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              <span>New Folder</span>
            </button>
          )}
        </div>

        {/* Templates content */}
        <div className="flex-1 min-w-0">
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
                  {search
                    ? <>No templates matching &ldquo;{search}&rdquo;</>
                    : "No templates in this folder."}
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
                    <span className="text-xs text-muted-foreground">
                      {formatDate(template.updated_at)}
                    </span>
                  </Link>
                  <div className="absolute top-4 right-4">
                    <TemplateMenu template={template} />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="divide-y">
                {filtered.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
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
                      <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
                        {formatDate(template.updated_at)}
                      </span>
                    </Link>
                    <TemplateMenu template={template} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Send to List Dialog */}
      <Dialog open={sendTemplateId !== null} onOpenChange={(open) => { if (!open) closeSendDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send to List</DialogTitle>
            <DialogDescription>
              Send &ldquo;{sendTemplateName}&rdquo; to a contact list.
            </DialogDescription>
          </DialogHeader>

          {sendResult ? (
            <div className="py-4 text-center">
              {sendResult.error ? (
                <p className="text-destructive">{sendResult.error}</p>
              ) : (
                <>
                  <Check className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <p className="font-medium">
                    Ready to send to {sendResult.sent}{" "}
                    {sendResult.sent === 1 ? "contact" : "contacts"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    SendGrid integration coming soon. Recipients have been queued.
                  </p>
                </>
              )}
              <DialogFooter className="mt-4">
                <Button onClick={closeSendDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lists.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No contact lists yet. Create one in Contacts &gt; Lists.
                  </p>
                ) : (
                  lists.map((list) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => setSelectedListId(list.id)}
                      className={`flex items-center gap-3 w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedListId === list.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {list.type === "smart" ? (
                        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{list.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {list.member_count} {list.member_count === 1 ? "contact" : "contacts"}
                        </p>
                      </div>
                      {selectedListId === list.id && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
              {selectedList && (
                <p className="text-sm text-muted-foreground">
                  This will send to {selectedList.member_count}{" "}
                  {selectedList.member_count === 1 ? "contact" : "contacts"} in &ldquo;{selectedList.name}&rdquo;.
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeSendDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={!selectedListId || isSending}
                  className="gap-1.5"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
