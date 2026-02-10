import { getControlPlaneClient } from "./control-plane";

const BUCKET = "org-assets";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
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
