"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@sgscore/ui";
import { ArrowLeft, Eye, Save, Check, Loader2 } from "lucide-react";
import type {
  EmailBlock,
  EmailBlockType,
  EmailBlockProps,
  EmailTemplateSettings,
} from "@sgscore/types";
import { useOrg } from "@/components/org-provider";
import { createEmailTemplate, updateEmailTemplate } from "../actions";
import { BlockPalette } from "./block-palette";
import { BlockCanvas } from "./block-canvas";
import { BlockEditor } from "./block-editor";
import { EmailPreviewDialog } from "./email-preview-dialog";
import { renderEmailHtml } from "./render-email-html";

// ---------------------------------------------------------------------------
// Default blocks for new templates
// ---------------------------------------------------------------------------

function makeId(): string {
  return crypto.randomUUID();
}

const DEFAULT_SETTINGS: EmailTemplateSettings = {
  backgroundColor: "#f4f4f5",
  contentWidth: 600,
  fontFamily: "Arial, Helvetica, sans-serif",
};

function createDefaultBlocks(): EmailBlock[] {
  return [
    {
      id: makeId(),
      type: "header",
      props: {
        logoUrl: "",
        logoAlt: "",
        logoWidth: 150,
        title: "Your Company",
        backgroundColor: "#4E2C70",
        textColor: "#ffffff",
        alignment: "center",
      },
    },
    {
      id: makeId(),
      type: "text",
      props: {
        html: "<p>Start writing your email content here...</p>",
        color: "#374151",
        alignment: "left",
      },
    },
    {
      id: makeId(),
      type: "footer",
      props: {
        html: "",
        companyName: "Your Company",
        address: "123 Main St, City, State 12345",
        color: "#6b7280",
        backgroundColor: "#f9fafb",
        alignment: "center",
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Default props per block type
// ---------------------------------------------------------------------------

function getDefaultProps(type: EmailBlockType): EmailBlockProps {
  switch (type) {
    case "header":
      return {
        logoUrl: "",
        logoAlt: "",
        logoWidth: 150,
        title: "Header",
        backgroundColor: "#4E2C70",
        textColor: "#ffffff",
        alignment: "center",
      };
    case "heading":
      return { text: "Heading", level: "h1", color: "#111111", alignment: "left" };
    case "text":
      return { html: "<p>Your text here</p>", color: "#374151", alignment: "left" };
    case "image":
      return { src: "", alt: "", width: 536, href: "", alignment: "center" };
    case "button":
      return {
        text: "Click me",
        href: "",
        backgroundColor: "#4E2C70",
        textColor: "#ffffff",
        borderRadius: 6,
        alignment: "center",
        fullWidth: false,
      };
    case "divider":
      return { color: "#e5e7eb", thickness: 1, style: "solid", padding: 16 };
    case "spacer":
      return { height: 32 };
    case "columns":
      return {
        columns: [{ html: "<p>Column 1</p>" }, { html: "<p>Column 2</p>" }],
        ratio: "50-50",
        gap: 16,
      };
    case "social":
      return { alignment: "center", iconSize: 32, links: [] };
    case "footer":
      return {
        html: "",
        companyName: "Your Company",
        address: "123 Main St, City, State 12345",
        color: "#6b7280",
        backgroundColor: "#f9fafb",
        alignment: "center",
      };
  }
}

// ---------------------------------------------------------------------------
// History stack for undo/redo
// ---------------------------------------------------------------------------

interface BuilderState {
  blocks: EmailBlock[];
  settings: EmailTemplateSettings;
  name: string;
  subject: string;
  preheader: string;
}

const MAX_HISTORY = 50;

// ---------------------------------------------------------------------------
// Builder component
// ---------------------------------------------------------------------------

interface EmailBuilderProps {
  templateId?: string;
  initialData?: {
    name: string;
    subject: string;
    preheader: string;
    blocks: EmailBlock[];
    settings: EmailTemplateSettings;
  };
}

export function EmailBuilder({ templateId, initialData }: EmailBuilderProps) {
  const { org } = useOrg();
  const router = useRouter();

  // State
  const [name, setName] = useState(initialData?.name ?? "Untitled Template");
  const [subject, setSubject] = useState(initialData?.subject ?? "");
  const [preheader, setPreheader] = useState(initialData?.preheader ?? "");
  const [blocks, setBlocks] = useState<EmailBlock[]>(
    initialData?.blocks?.length ? initialData.blocks : createDefaultBlocks(),
  );
  const [settings, setSettings] = useState<EmailTemplateSettings>(
    initialData?.settings?.fontFamily ? initialData.settings : { ...DEFAULT_SETTINGS },
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "idle">(
    templateId ? "saved" : "idle",
  );
  const [showPreview, setShowPreview] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<BuilderState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedo = useRef(false);

  // Push state to history
  const pushHistory = useCallback(
    (state: BuilderState) => {
      if (isUndoRedo.current) {
        isUndoRedo.current = false;
        return;
      }
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        const next = [...trimmed, state].slice(-MAX_HISTORY);
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex],
  );

  // Track changes for undo
  const prevStateRef = useRef<string>("");
  useEffect(() => {
    const stateStr = JSON.stringify({ blocks, settings, name, subject, preheader });
    if (stateStr !== prevStateRef.current) {
      prevStateRef.current = stateStr;
      pushHistory({ blocks, settings, name, subject, preheader });
    }
  }, [blocks, settings, name, subject, preheader, pushHistory]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          isUndoRedo.current = true;
          const prev = history[historyIndex - 1];
          setHistoryIndex(historyIndex - 1);
          setBlocks(prev.blocks);
          setSettings(prev.settings);
          setName(prev.name);
          setSubject(prev.subject);
          setPreheader(prev.preheader);
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          isUndoRedo.current = true;
          const next = history[historyIndex + 1];
          setHistoryIndex(historyIndex + 1);
          setBlocks(next.blocks);
          setSettings(next.settings);
          setName(next.name);
          setSubject(next.subject);
          setPreheader(next.preheader);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, historyIndex]);

  // Auto-save (edit mode only, debounced 3s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isMounted = useRef(false);
  const savedSnapshot = useRef("");

  // Set the initial snapshot once on mount to avoid saving immediately
  useEffect(() => {
    if (templateId && !isMounted.current) {
      savedSnapshot.current = JSON.stringify({ blocks, settings, name, subject, preheader });
      isMounted.current = true;
    }
  });// eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once

  useEffect(() => {
    if (!templateId || !isMounted.current) return;
    const current = JSON.stringify({ blocks, settings, name, subject, preheader });
    if (current === savedSnapshot.current) {
      // State matches what was last saved — no action needed
      if (saveStatus === "unsaved") setSaveStatus("saved");
      return;
    }

    setSaveStatus("unsaved");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      // Re-check — state may have changed while the timer was running
      const snapshot = JSON.stringify({ blocks, settings, name, subject, preheader });
      setSaveStatus("saving");
      const html = renderEmailHtml(blocks, settings, preheader);
      const result = await updateEmailTemplate(org.slug, templateId, {
        name,
        subject,
        preheader,
        blocks,
        settings,
        html_content: html,
      });
      if (!result.error) {
        savedSnapshot.current = snapshot;
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    }, 3000);

    return () => clearTimeout(saveTimerRef.current);
  }, [blocks, settings, name, subject, preheader, templateId, org.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn on navigate away with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatus === "unsaved") {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // Block operations
  const addBlock = useCallback(
    (type: EmailBlockType) => {
      const newBlock: EmailBlock = {
        id: makeId(),
        type,
        props: getDefaultProps(type),
      };

      setBlocks((prev) => {
        // Insert after selected block or before footer
        const footerIndex = prev.findIndex((b) => b.type === "footer");
        const selectedIndex = selectedBlockId
          ? prev.findIndex((b) => b.id === selectedBlockId)
          : -1;

        let insertAt: number;
        if (selectedIndex >= 0 && selectedIndex < footerIndex) {
          insertAt = selectedIndex + 1;
        } else if (footerIndex >= 0) {
          insertAt = footerIndex;
        } else {
          insertAt = prev.length;
        }

        const next = [...prev];
        next.splice(insertAt, 0, newBlock);
        return next;
      });

      setSelectedBlockId(newBlock.id);
    },
    [selectedBlockId],
  );

  const removeBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (selectedBlockId === id) setSelectedBlockId(null);
    },
    [selectedBlockId],
  );

  const moveBlock = useCallback(
    (oldIndex: number, newIndex: number) => {
      setBlocks((prev) => {
        const next = [...prev];
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
        return next;
      });
    },
    [],
  );

  const updateBlockProps = useCallback(
    (id: string, props: Partial<EmailBlockProps>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, props: props as EmailBlockProps } : b)),
      );
    },
    [],
  );

  const insertBlockAt = useCallback(
    (index: number, type: EmailBlockType) => {
      const newBlock: EmailBlock = {
        id: makeId(),
        type,
        props: getDefaultProps(type),
      };
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(index, 0, newBlock);
        return next;
      });
      setSelectedBlockId(newBlock.id);
    },
    [],
  );

  // Save handler (for new templates or manual save)
  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    const html = renderEmailHtml(blocks, settings, preheader);

    if (templateId) {
      const result = await updateEmailTemplate(org.slug, templateId, {
        name,
        subject,
        preheader,
        blocks,
        settings,
        html_content: html,
      });
      if (!result.error) {
        savedSnapshot.current = JSON.stringify({ blocks, settings, name, subject, preheader });
        setSaveStatus("saved");
      } else {
        setSaveStatus("unsaved");
      }
    } else {
      const result = await createEmailTemplate(org.slug, {
        name,
        subject,
        preheader,
        blocks,
        settings,
        html_content: html,
      });
      if (result.id) {
        router.replace(`/org/${org.slug}/communication/email/${result.id}`);
      }
    }
  }, [blocks, settings, name, subject, preheader, templateId, org.slug, router]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const handleBack = useCallback(() => {
    router.push(`/org/${org.slug}/communication/email`);
  }, [router, org.slug]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 h-14 shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-48 font-semibold text-sm border-transparent hover:border-input focus:border-input"
        />

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line..."
            className="h-8 flex-1 text-sm"
          />
          <Input
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
            placeholder="Preview text..."
            className="h-8 w-48 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
          >
            <Save className="h-4 w-4" />
            {templateId ? "Save" : "Create"}
          </Button>
        </div>
      </div>

      {/* 3-panel body */}
      <div className="flex flex-1 min-h-0">
        <BlockPalette onAdd={addBlock} />

        <BlockCanvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelect={setSelectedBlockId}
          onMove={moveBlock}
          onRemove={removeBlock}
          onUpdateProps={updateBlockProps}
          onInsertAt={insertBlockAt}
        />

        <BlockEditor
          block={selectedBlock}
          settings={settings}
          onUpdateBlock={(props) => {
            if (selectedBlockId) {
              updateBlockProps(selectedBlockId, props);
            }
          }}
          onUpdateSettings={(partial) =>
            setSettings((prev) => ({ ...prev, ...partial }))
          }
        />
      </div>

      {/* Preview dialog */}
      <EmailPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        html={renderEmailHtml(blocks, settings, preheader)}
        subject={subject}
      />
    </div>
  );
}
