import { getControlPlaneClient } from "./control-plane";

const BUCKET = "org-assets";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_TYPES,
  "application/pdf",
  "application/zip",
];

/**
 * Creates the public `org-assets` bucket if it doesn't already exist.
 */
export async function ensureOrgAssetsBucket(): Promise<void> {
  const cp = getControlPlaneClient();
  const { data: buckets } = await cp.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await cp.storage.createBucket(BUCKET, { public: true });
  }
}

/**
 * Uploads an org logo to `org-assets/{orgId}/logo.{ext}`.
 * Validates type and size. Deletes any previous logo first.
 * Returns the public URL of the uploaded file.
 */
export async function uploadOrgLogo(
  orgId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PNG, JPG, WebP, SVG.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum size is 2 MB.");
  }

  const cp = getControlPlaneClient();

  await ensureOrgAssetsBucket();

  // Delete any existing logo files
  await deleteOrgLogo(orgId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/logo.${ext}`;

  const { error } = await cp.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = cp.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * Removes all files under `org-assets/{orgId}/`.
 */
export async function deleteOrgLogo(orgId: string): Promise<void> {
  const cp = getControlPlaneClient();
  const { data: files } = await cp.storage.from(BUCKET).list(orgId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${orgId}/${f.name}`);
    await cp.storage.from(BUCKET).remove(paths);
  }
}

/**
 * Uploads a front image for a membership card design.
 * Stores at `org-assets/{orgId}/membership-cards/{cardId}/front.{ext}`.
 * Returns the public URL of the uploaded file.
 */
export async function uploadCardImage(
  orgId: string,
  cardId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PNG, JPG, WebP, SVG.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum size is 2 MB.");
  }

  const cp = getControlPlaneClient();

  await ensureOrgAssetsBucket();

  // Delete any existing card image first
  await deleteCardImage(orgId, cardId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/membership-cards/${cardId}/front.${ext}`;

  const { error } = await cp.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = cp.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * Removes front image files for a membership card design.
 */
export async function deleteCardImage(
  orgId: string,
  cardId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/membership-cards/${cardId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${folder}/${f.name}`);
    await cp.storage.from(BUCKET).remove(paths);
  }
}

// ---------------------------------------------------------------------------
// Portal Storage Helpers
// ---------------------------------------------------------------------------

/**
 * Uploads a hero image for the portal login page.
 * Stores at `org-assets/{orgId}/portal/hero.{ext}`.
 */
export async function uploadPortalImage(
  orgId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PNG, JPG, WebP, SVG.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum size is 2 MB.");
  }

  const cp = getControlPlaneClient();
  await ensureOrgAssetsBucket();
  await deletePortalImage(orgId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/portal/hero.${ext}`;

  const { error } = await cp.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = cp.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * Removes the portal hero image.
 */
export async function deletePortalImage(orgId: string): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/portal`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const heroFiles = files.filter((f) => f.name.startsWith("hero."));
    if (heroFiles.length > 0) {
      const paths = heroFiles.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}

/**
 * Uploads a file (PDF, ZIP, or image) for a portal module.
 * Stores at `org-assets/{orgId}/portal/modules/{moduleId}/{filename}`.
 */
export async function uploadModuleFile(
  orgId: string,
  moduleId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PNG, JPG, WebP, SVG, PDF, ZIP.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size is 10 MB.");
  }

  const cp = getControlPlaneClient();
  await ensureOrgAssetsBucket();
  await deleteModuleFile(orgId, moduleId);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/portal/modules/${moduleId}/${safeName}`;

  const { error } = await cp.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = cp.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * Removes the content file for a portal module (excludes thumbnail).
 */
export async function deleteModuleFile(
  orgId: string,
  moduleId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/portal/modules/${moduleId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const nonThumb = files.filter((f) => !f.name.startsWith("thumb."));
    if (nonThumb.length > 0) {
      const paths = nonThumb.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}

/**
 * Uploads a thumbnail for a portal module.
 * Stores at `org-assets/{orgId}/portal/modules/{moduleId}/thumb.{ext}`.
 */
export async function uploadModuleThumbnail(
  orgId: string,
  moduleId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PNG, JPG, WebP, SVG.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum size is 2 MB.");
  }

  const cp = getControlPlaneClient();
  await ensureOrgAssetsBucket();
  await deleteModuleThumbnail(orgId, moduleId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/portal/modules/${moduleId}/thumb.${ext}`;

  const { error } = await cp.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = cp.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

/**
 * Removes the thumbnail for a portal module.
 */
export async function deleteModuleThumbnail(
  orgId: string,
  moduleId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/portal/modules/${moduleId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const thumbFiles = files.filter((f) => f.name.startsWith("thumb."));
    if (thumbFiles.length > 0) {
      const paths = thumbFiles.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}
