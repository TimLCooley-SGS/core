import { getPlatformSettings } from "@sgscore/api";
import { PlatformGeneralForm } from "./general-form";

export default async function PlatformGeneralPage() {
  const settings = await getPlatformSettings();

  return (
    <PlatformGeneralForm
      faviconUrl={settings.favicon_url ?? null}
      logoUrl={settings.logo_url ?? null}
    />
  );
}
