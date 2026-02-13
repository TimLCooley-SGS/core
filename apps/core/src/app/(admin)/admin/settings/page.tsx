import { redirect } from "next/navigation";

export default function PlatformSettingsPage() {
  redirect("/admin/settings/general");
}
