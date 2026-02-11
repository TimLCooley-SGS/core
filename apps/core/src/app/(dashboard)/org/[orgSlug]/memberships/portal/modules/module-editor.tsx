"use client";

import { useState, useRef, useEffect, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sgscore/ui";
import type {
  PortalModule,
  PortalModuleType,
  MembershipCardDesign,
} from "@sgscore/types/tenant";
import { TiptapEditor } from "../tiptap-editor";
import {
  createModule,
  updateModule,
  uploadModuleFileAction,
  removeModuleFileAction,
  uploadModuleThumbnailAction,
  removeModuleThumbnailAction,
} from "../actions";

const MODULE_TYPES: { value: PortalModuleType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "audio", label: "Audio" },
  { value: "html", label: "HTML" },
  { value: "file_download", label: "File Download" },
];

interface ModuleEditorProps {
  orgSlug: string;
  module?: PortalModule;
  cardDesigns: MembershipCardDesign[];
}

export function ModuleEditor({ orgSlug, module, cardDesigns }: ModuleEditorProps) {
  const router = useRouter();
  const isEdit = !!module;

  const [title, setTitle] = useState(module?.title ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [moduleType, setModuleType] = useState<PortalModuleType>(
    module?.module_type ?? "text",
  );
  const [contentHtml, setContentHtml] = useState(module?.content_html ?? "");
  const [embedUrl, setEmbedUrl] = useState(module?.embed_url ?? "");
  const [status, setStatus] = useState(module?.status ?? "draft");
  const [thumbnailUrl, setThumbnailUrl] = useState(module?.thumbnail_url ?? null);
  const [fileUrl, setFileUrl] = useState(module?.file_url ?? null);
  const [fileName, setFileName] = useState(module?.file_name ?? null);
  const [restrictedCardDesignIds, setRestrictedCardDesignIds] = useState<Set<string>>(
    new Set(module?.restricted_card_design_ids ?? []),
  );

  // Form actions
  const action = isEdit ? updateModule : createModule;
  const [saveState, saveAction, savePending] = useActionState(action, {});
  const [uploadFileState, uploadFileAction] = useActionState(uploadModuleFileAction, {});
  const [removeFileState, removeFileAction] = useActionState(removeModuleFileAction, {});
  const [uploadThumbState, uploadThumbAction] = useActionState(uploadModuleThumbnailAction, {});
  const [removeThumbState, removeThumbAction] = useActionState(removeModuleThumbnailAction, {});

  const [isUploadingFile, startUploadFile] = useTransition();
  const [isRemovingFile, startRemoveFile] = useTransition();
  const [isUploadingThumb, startUploadThumb] = useTransition();
  const [isRemovingThumb, startRemoveThumb] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Redirect on successful create
  useEffect(() => {
    if (saveState.success && saveState.moduleId && !isEdit) {
      router.push(`/org/${orgSlug}/memberships/portal/modules/${saveState.moduleId}`);
    }
  }, [saveState.success, saveState.moduleId, isEdit, orgSlug, router]);

  useEffect(() => {
    if (uploadFileState.success && uploadFileState.fileUrl) {
      setFileUrl(uploadFileState.fileUrl);
    }
  }, [uploadFileState.success, uploadFileState.fileUrl]);

  useEffect(() => {
    if (removeFileState.success) {
      setFileUrl(null);
      setFileName(null);
    }
  }, [removeFileState.success]);

  useEffect(() => {
    if (uploadThumbState.success && uploadThumbState.imageUrl) {
      setThumbnailUrl(uploadThumbState.imageUrl);
    }
  }, [uploadThumbState.success, uploadThumbState.imageUrl]);

  useEffect(() => {
    if (removeThumbState.success) {
      setThumbnailUrl(null);
    }
  }, [removeThumbState.success]);

  function handleSave() {
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    if (module) fd.append("moduleId", module.id);
    fd.append("title", title);
    fd.append("description", description);
    fd.append("moduleType", moduleType);
    fd.append("contentHtml", contentHtml);
    fd.append("embedUrl", embedUrl);
    fd.append("status", status);
    const restricted = Array.from(restrictedCardDesignIds);
    fd.append(
      "restrictedCardDesignIds",
      restricted.length > 0 ? JSON.stringify(restricted) : "",
    );
    saveAction(fd);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !module) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("moduleId", module.id);
    fd.append("file", file);
    startUploadFile(() => {
      uploadFileAction(fd);
    });
    setFileName(file.name);
    e.target.value = "";
  }

  function handleFileRemove() {
    if (!module) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("moduleId", module.id);
    startRemoveFile(() => {
      removeFileAction(fd);
    });
  }

  function handleThumbUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !module) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("moduleId", module.id);
    fd.append("file", file);
    startUploadThumb(() => {
      uploadThumbAction(fd);
    });
    e.target.value = "";
  }

  function handleThumbRemove() {
    if (!module) return;
    const fd = new FormData();
    fd.append("orgSlug", orgSlug);
    fd.append("moduleId", module.id);
    startRemoveThumb(() => {
      removeThumbAction(fd);
    });
  }

  function toggleCardRestriction(cardId: string) {
    setRestrictedCardDesignIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  const showRichEditor = moduleType === "text" || moduleType === "html";
  const showEmbedUrl = moduleType === "video" || moduleType === "audio";
  const showFileUpload = moduleType === "pdf" || moduleType === "file_download";

  const fileAccept =
    moduleType === "pdf"
      ? "application/pdf"
      : "application/pdf,application/zip,image/*";

  return (
    <div className="max-w-4xl space-y-4">
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          {/* Title & description */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="moduleTitle">Title *</Label>
                <Input
                  id="moduleTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Module title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleDesc">Description</Label>
                <Input
                  id="moduleDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Module type selector (only for new) */}
          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Module Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {MODULE_TYPES.map((mt) => (
                    <Button
                      key={mt.value}
                      type="button"
                      variant={moduleType === mt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setModuleType(mt.value)}
                    >
                      {mt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content area varies by type */}
          {showRichEditor && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content</CardTitle>
              </CardHeader>
              <CardContent>
                <TiptapEditor
                  content={contentHtml}
                  onChange={setContentHtml}
                  placeholder="Write your content..."
                />
              </CardContent>
            </Card>
          )}

          {showEmbedUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {moduleType === "video" ? "Video" : "Audio"} Embed URL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://www.youtube.com/embed/..."
                />
                {embedUrl && (
                  <div className="rounded-md border overflow-hidden bg-muted">
                    <iframe
                      src={embedUrl}
                      className="w-full"
                      style={{ aspectRatio: "16 / 9" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Embed preview"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showFileUpload && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fileUrl && (
                  <div className="rounded-md border p-3 bg-muted/30 flex items-center justify-between">
                    <span className="text-sm truncate">{fileName ?? "Uploaded file"}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRemovingFile}
                      onClick={handleFileRemove}
                    >
                      {isRemovingFile ? "Removing..." : "Remove"}
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Max 10 MB. {moduleType === "pdf" ? "PDF only." : "PDF or ZIP."}
                </p>
                {uploadFileState.error && (
                  <p className="text-sm text-destructive">{uploadFileState.error}</p>
                )}
                {removeFileState.error && (
                  <p className="text-sm text-destructive">{removeFileState.error}</p>
                )}
                {isEdit ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={fileAccept}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploadingFile ? "Uploading..." : "Upload File"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Save the module first, then upload a file.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={status === "draft" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("draft")}
                >
                  Draft
                </Button>
                <Button
                  type="button"
                  variant={status === "published" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus("published")}
                >
                  Published
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Thumbnail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thumbnail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail"
                  className="max-w-[200px] rounded-md border"
                />
              )}
              <p className="text-sm text-muted-foreground">
                Max 2 MB. PNG, JPG, WebP, or SVG.
              </p>
              {uploadThumbState.error && (
                <p className="text-sm text-destructive">{uploadThumbState.error}</p>
              )}
              {removeThumbState.error && (
                <p className="text-sm text-destructive">{removeThumbState.error}</p>
              )}
              {isEdit ? (
                <div className="flex gap-3">
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleThumbUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingThumb}
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    {isUploadingThumb ? "Uploading..." : "Upload Thumbnail"}
                  </Button>
                  {thumbnailUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isRemovingThumb}
                      onClick={handleThumbRemove}
                    >
                      {isRemovingThumb ? "Removing..." : "Remove"}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Save the module first, then upload a thumbnail.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card design restrictions */}
          {cardDesigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Restrict to Card Designs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Leave all unchecked to make available to all members.
                </p>
                <div className="space-y-2">
                  {cardDesigns.map((cd) => (
                    <div key={cd.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`mod-cd-${cd.id}`}
                        checked={restrictedCardDesignIds.has(cd.id)}
                        onCheckedChange={() => toggleCardRestriction(cd.id)}
                      />
                      <Label htmlFor={`mod-cd-${cd.id}`}>{cd.name}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Save */}
      {saveState.error && (
        <p className="text-sm text-destructive">{saveState.error}</p>
      )}
      {saveState.success && isEdit && (
        <p className="text-sm text-green-600">Module saved.</p>
      )}
      <Button
        type="button"
        disabled={savePending || !title.trim()}
        onClick={handleSave}
      >
        {savePending
          ? "Saving..."
          : isEdit
            ? "Save Changes"
            : "Create Module"}
      </Button>
    </div>
  );
}
