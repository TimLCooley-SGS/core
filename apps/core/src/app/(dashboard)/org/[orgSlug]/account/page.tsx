import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountProfile } from "./actions";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getAccountProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Personal Settings</h1>
      <AccountForm
        displayName={profile.displayName}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
      />
    </div>
  );
}
