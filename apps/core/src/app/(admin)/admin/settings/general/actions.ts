"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  getSgsStaffByIdentity,
  uploadPlatformAsset,
  deletePlatformAsset,
  setPlatformSetting,
  deletePlatformSetting,
} from "@sgscore/api";

interface ActionState {
  error?: string;
  success?: boolean;
}

async function requireStaff(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) return { error: "Not authorized. Platform staff required." };

  return { userId: user.id };
}

export async function uploadFaviconAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided." };

  let url: string;
  try {
    url = await uploadPlatformAsset("favicon", file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  try {
    await setPlatformSetting("favicon_url", url);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save setting." };
  }

  const cp = getControlPlaneClient();
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "platform.favicon_uploaded",
    resource_type: "platform_settings",
    resource_id: "favicon_url",
    metadata: { url },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function removeFaviconAction(
  _prev: ActionState,
): Promise<ActionState> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  try {
    await deletePlatformAsset("favicon");
    await deletePlatformSetting("favicon_url");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to remove favicon." };
  }

  const cp = getControlPlaneClient();
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "platform.favicon_removed",
    resource_type: "platform_settings",
    resource_id: "favicon_url",
    metadata: {},
  });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function uploadLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided." };

  let url: string;
  try {
    url = await uploadPlatformAsset("logo", file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }

  try {
    await setPlatformSetting("logo_url", url);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save setting." };
  }

  const cp = getControlPlaneClient();
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "platform.logo_uploaded",
    resource_type: "platform_settings",
    resource_id: "logo_url",
    metadata: { url },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function removeLogoAction(
  _prev: ActionState,
): Promise<ActionState> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  try {
    await deletePlatformAsset("logo");
    await deletePlatformSetting("logo_url");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to remove logo." };
  }

  const cp = getControlPlaneClient();
  await cp.from("platform_audit_log").insert({
    actor_id: auth.userId,
    action: "platform.logo_removed",
    resource_type: "platform_settings",
    resource_id: "logo_url",
    metadata: {},
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
