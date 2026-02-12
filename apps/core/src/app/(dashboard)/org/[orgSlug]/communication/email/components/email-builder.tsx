"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@sgscore/ui";
import { ArrowLeft, Eye, Save, Check, Loader2, Send } from "lucide-react";
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
import { VariablePicker } from "./variable-picker";
import { sendTestEmailAction } from "../test-email-action";

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
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-save: snapshot tracking via ref (no re-render on dirty change)
  const savedSnapshotRef = useRef("");
  const snapshotInitRef = useRef(false);
  if (templateId && !snapshotInitRef.current) {
    // Runs during first render — state vars are already initialized above
    savedSnapshotRef.current = JSON.stringify({ blocks, settings, name, subject, preheader });
    snapshotInitRef.current = true;
  }
  // Derived dirty flag — compared every render but never stored in state
  const currentSnapshot = JSON.stringify({ blocks, settings, name, subject, preheader });
  const isDirty = Boolean(templateId) && currentSnapshot !== savedSnapshotRef.current;

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

  // Auto-save: debounced 3s, only in edit mode
  useEffect(() => {
    if (!templateId || !isDirty || isSaving) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      const snapshot = JSON.stringify({ blocks, settings, name, subject, preheader });
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
        savedSnapshotRef.current = snapshot;
      }
      setIsSaving(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [blocks, settings, name, subject, preheader, templateId, org.slug, isDirty, isSaving]);

  // Warn on navigate away with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
    setIsSaving(true);
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
        savedSnapshotRef.current = JSON.stringify({ blocks, settings, name, subject, preheader });
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
    setIsSaving(false);
  }, [blocks, settings, name, subject, preheader, templateId, org.slug, router]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  const handleBack = useCallback(() => {
    router.push(`/org/${org.slug}/communication/email`);
  }, [router, org.slug]);

  // Insert variable into the currently selected text/heading/button block
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleInsertVariable = useCallback(
    (variableKey: string) => {
      const tag = `{{${variableKey}}}`;
      if (!selectedBlock) {
        alert("Select a text, heading, or button block first to insert a variable.");
        return;
      }
      const blockType = selectedBlock.type;
      if (blockType === "text") {
        const p = selectedBlock.props as import("@sgscore/types").TextBlockProps;
        updateBlockProps(selectedBlock.id, { ...p, html: p.html + tag });
      } else if (blockType === "heading") {
        const p = selectedBlock.props as import("@sgscore/types").HeadingBlockProps;
        updateBlockProps(selectedBlock.id, { ...p, text: p.text + tag });
      } else if (blockType === "button") {
        const p = selectedBlock.props as import("@sgscore/types").ButtonBlockProps;
        updateBlockProps(selectedBlock.id, { ...p, text: p.text + tag });
      } else {
        alert("Variables can only be inserted into text, heading, or button blocks.");
      }
    },
    [selectedBlock, updateBlockProps],
  );

  const handleSendTest = useCallback(async () => {
    if (!templateId) {
      alert("Save the template first before sending a test.");
      return;
    }
    setTestSending(true);
    setTestResult(null);
    const result = await sendTestEmailAction(org.slug, templateId);
    setTestResult(result.error ?? "Test email sent!");
    setTestSending(false);
    // Clear message after 5s
    setTimeout(() => setTestResult(null), 5000);
  }, [templateId, org.slug]);

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
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && !isDirty && templateId && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              Saved
            </span>
          )}
          {!isSaving && isDirty && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          {testResult && (
            <span className={`text-xs ${testResult.startsWith("Test") ? "text-green-600" : "text-destructive"}`}>
              {testResult}
            </span>
          )}

          <VariablePicker onInsert={handleInsertVariable} />

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
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleSendTest}
            disabled={testSending || !templateId}
          >
            {testSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send Test
          </Button>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleSave}
            disabled={isSaving}
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
          onInsertVariable={handleInsertVariable}
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
