import { getControlPlaneClient } from "./control-plane";
import { ensureOrgAssetsBucket } from "./storage";

const BUCKET = "org-assets";
const PLATFORM_FOLDER = "platform";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

/**
 * Fetches all platform settings as a key-value record.
 */
export async function getPlatformSettings(): Promise<Record<string, string>> {
  const cp = getControlPlaneClient();
  const { data, error } = await cp
    .from("platform_settings")
    .select("key, value");

  if (error) throw new Error(`Failed to fetch settings: ${error.message}`);

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }
  return result;
}

/**
 * Upserts a single platform setting.
 */
export async function setPlatformSetting(
  key: string,
  value: string,
): Promise<void> {
  const cp = getControlPlaneClient();
  const { error } = await cp.from("platform_settings").upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw new Error(`Failed to save setting: ${error.message}`);
}

/**
 * Deletes a single platform setting row.
 */
export async function deletePlatformSetting(key: string): Promise<void> {
  const cp = getControlPlaneClient();
  const { error } = await cp
    .from("platform_settings")
    .delete()
    .eq("key", key);
  if (error) throw new Error(`Failed to delete setting: ${error.message}`);
}

/**
 * Uploads a platform asset to `org-assets/platform/{assetName}.{ext}`.
 * Deletes any previous file for that asset name first.
 * Returns the public URL.
 */
export async function uploadPlatformAsset(
  assetName: string,
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
  await deletePlatformAsset(assetName);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${PLATFORM_FOLDER}/${assetName}.${ext}`;

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
 * Removes a platform asset from storage.
 */
export async function deletePlatformAsset(assetName: string): Promise<void> {
  const cp = getControlPlaneClient();
  const { data: files } = await cp.storage
    .from(BUCKET)
    .list(PLATFORM_FOLDER);
  if (files && files.length > 0) {
    const matching = files.filter((f) => f.name.startsWith(`${assetName}.`));
    if (matching.length > 0) {
      const paths = matching.map((f) => `${PLATFORM_FOLDER}/${f.name}`);
      await cp.storage.from(BUCKET).remove(paths);
    }
  }
}
