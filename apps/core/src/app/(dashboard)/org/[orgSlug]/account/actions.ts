"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getControlPlaneClient,
  uploadUserAvatar as uploadAvatar,
  deleteUserAvatar as deleteAvatar,
} from "@sgscore/api";

interface ActionState {
  error?: string;
  success?: string;
}

export interface AccountProfile {
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

async function requireAuth(): Promise<
  { userId: string; email: string } | { error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  return { userId: user.id, email: user.email ?? "" };
}

export async function getAccountProfile(): Promise<AccountProfile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { email: "", displayName: "", avatarUrl: null };
  }

  const cp = getControlPlaneClient();
  const { data: identity } = await cp
    .from("global_identities")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  return {
    email: user.email ?? "",
    displayName: user.user_metadata?.display_name ?? "",
    avatarUrl: (identity?.avatar_url as string) ?? null,
  };
}

export async function updateDisplayName(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const displayName = (formData.get("displayName") as string)?.trim();
  if (!displayName) return { error: "Display name is required." };

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createSupabaseServerClient();

  // Update auth user metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (authError) return { error: `Failed to update: ${authError.message}` };

  // Update global_identities record
  const cp = getControlPlaneClient();
  await cp
    .from("global_identities")
    .update({ display_name: displayName })
    .eq("id", auth.userId);

  revalidatePath("/", "layout");
  return { success: "Display name updated." };
}

export async function updateEmail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const newEmail = (formData.get("email") as string)?.trim().toLowerCase();
  if (!newEmail) return { error: "Email is required." };

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  const supabase = await createSupabaseServerClient();

  const { error: authError } = await supabase.auth.updateUser({
    email: newEmail,
  });
  if (authError) return { error: `Failed to update: ${authError.message}` };

  // Update global_identities record
  const cp = getControlPlaneClient();
  await cp
    .from("global_identities")
    .update({ primary_email: newEmail })
    .eq("id", auth.userId);

  return {
    success:
      "A confirmation link has been sent to your new email address. Please verify it to complete the change.",
  };
}

export async function uploadAvatarAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided." };

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  let avatarUrl: string;
  try {
    avatarUrl = await uploadAvatar(auth.userId, file);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }

  const cp = getControlPlaneClient();
  const { error: updateError } = await cp
    .from("global_identities")
    .update({ avatar_url: avatarUrl })
    .eq("id", auth.userId);

  if (updateError) {
    return { error: `Failed to save avatar URL: ${updateError.message}` };
  }

  revalidatePath("/", "layout");
  return { success: "Profile photo updated." };
}

export async function removeAvatarAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // formData not used but required by useActionState signature
  void formData;

  const auth = await requireAuth();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteAvatar(auth.userId);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to remove photo.",
    };
  }

  const cp = getControlPlaneClient();
  const { error: updateError } = await cp
    .from("global_identities")
    .update({ avatar_url: null })
    .eq("id", auth.userId);

  if (updateError) {
    return { error: `Failed to update: ${updateError.message}` };
  }

  revalidatePath("/", "layout");
  return { success: "Profile photo removed." };
}
