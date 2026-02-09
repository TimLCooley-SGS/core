import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSgsStaffByIdentity } from "@sgscore/api";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const staff = await getSgsStaffByIdentity(user.id);
  if (!staff) redirect("/org-picker");

  const initials = (
    user.user_metadata?.display_name ??
    user.email ??
    "?"
  )
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen">
      <AdminSidebar staffRole={staff.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar staffRole={staff.role} initials={initials} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
