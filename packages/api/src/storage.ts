import { getControlPlaneClient } from "./control-plane";
import type { LogoVariant } from "@sgscore/types";
import { LOGO_VARIANT_FILENAMES } from "@sgscore/types";

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
 * Removes the primary logo files under `org-assets/{orgId}/`.
 * Only deletes files starting with "logo." — not other variants or assets.
 */
export async function deleteOrgLogo(orgId: string): Promise<void> {
  await deleteOrgLogoVariant(orgId, "primary");
}

/**
 * Uploads an org logo variant to `org-assets/{orgId}/{variantFilename}.{ext}`.
 * Validates type and size. Deletes any previous file for that variant first.
 * Returns the public URL of the uploaded file.
 */
export async function uploadOrgLogoVariant(
  orgId: string,
  variant: LogoVariant,
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
  await deleteOrgLogoVariant(orgId, variant);

  const stem = LOGO_VARIANT_FILENAMES[variant];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/${stem}.${ext}`;

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
 * Removes files for a specific logo variant under `org-assets/{orgId}/`.
 * Only deletes files whose name starts with the variant's filename stem.
 */
export async function deleteOrgLogoVariant(
  orgId: string,
  variant: LogoVariant,
): Promise<void> {
  const cp = getControlPlaneClient();
  const stem = LOGO_VARIANT_FILENAMES[variant];
  const { data: files } = await cp.storage.from(BUCKET).list(orgId);
  if (files && files.length > 0) {
    const variantFiles = files.filter((f) => f.name.startsWith(`${stem}.`));
    if (variantFiles.length > 0) {
      const paths = variantFiles.map((f) => `${orgId}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
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
// User Avatar Helpers
// ---------------------------------------------------------------------------

const AVATAR_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Uploads a user avatar to `org-assets/users/{userId}/avatar.{ext}`.
 * Validates type (PNG, JPG, WebP) and size (2 MB max).
 * Deletes any previous avatar first. Returns the public URL.
 */
export async function uploadUserAvatar(
  userId: string,
  file: File,
): Promise<string> {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PNG, JPG, WebP.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum size is 2 MB.");
  }

  const cp = getControlPlaneClient();
  await ensureOrgAssetsBucket();
  await deleteUserAvatar(userId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `users/${userId}/avatar.${ext}`;

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
 * Removes all avatar files under `org-assets/users/{userId}/`.
 */
export async function deleteUserAvatar(userId: string): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `users/${userId}`;
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

// ---------------------------------------------------------------------------
// Ticket Storage Helpers
// ---------------------------------------------------------------------------

/**
 * Uploads a banner image for a ticket type.
 * Stores at `org-assets/{orgId}/tickets/{ticketId}/banner.{ext}`.
 */
export async function uploadTicketBannerImage(
  orgId: string,
  ticketId: string,
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
  await deleteTicketBannerImage(orgId, ticketId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/tickets/${ticketId}/banner.${ext}`;

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
 * Removes the banner image for a ticket type.
 */
export async function deleteTicketBannerImage(
  orgId: string,
  ticketId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/tickets/${ticketId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const bannerFiles = files.filter((f) => f.name.startsWith("banner."));
    if (bannerFiles.length > 0) {
      const paths = bannerFiles.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}

/**
 * Uploads a square image for a ticket type.
 * Stores at `org-assets/{orgId}/tickets/{ticketId}/square.{ext}`.
 */
export async function uploadTicketSquareImage(
  orgId: string,
  ticketId: string,
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
  await deleteTicketSquareImage(orgId, ticketId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/tickets/${ticketId}/square.${ext}`;

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
 * Removes the square image for a ticket type.
 */
export async function deleteTicketSquareImage(
  orgId: string,
  ticketId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/tickets/${ticketId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const squareFiles = files.filter((f) => f.name.startsWith("square."));
    if (squareFiles.length > 0) {
      const paths = squareFiles.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}

// ---------------------------------------------------------------------------
// Event Storage Helpers
// ---------------------------------------------------------------------------

/**
 * Uploads a banner image for an event.
 * Stores at `org-assets/{orgId}/events/{eventId}/banner.{ext}`.
 */
export async function uploadEventBannerImage(
  orgId: string,
  eventId: string,
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
  await deleteEventBannerImage(orgId, eventId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/events/${eventId}/banner.${ext}`;

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
 * Removes the banner image for an event.
 */
export async function deleteEventBannerImage(
  orgId: string,
  eventId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/events/${eventId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const bannerFiles = files.filter((f) => f.name.startsWith("banner."));
    if (bannerFiles.length > 0) {
      const paths = bannerFiles.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}

/**
 * Uploads a square image for an event.
 * Stores at `org-assets/{orgId}/events/{eventId}/square.{ext}`.
 */
export async function uploadEventSquareImage(
  orgId: string,
  eventId: string,
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
  await deleteEventSquareImage(orgId, eventId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/events/${eventId}/square.${ext}`;

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
 * Removes the square image for an event.
 */
export async function deleteEventSquareImage(
  orgId: string,
  eventId: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const folder = `${orgId}/events/${eventId}`;
  const { data: files } = await cp.storage.from(BUCKET).list(folder);
  if (files && files.length > 0) {
    const squareFiles = files.filter((f) => f.name.startsWith("square."));
    if (squareFiles.length > 0) {
      const paths = squareFiles.map((f) => `${folder}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}
