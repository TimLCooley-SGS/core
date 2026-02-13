import { notFound } from "next/navigation";
import { getOrgBySlug, getTenantClient } from "@sgscore/api";
import { Button } from "@sgscore/ui";
import { Users } from "lucide-react";
import type { PortalSettings } from "@sgscore/types/tenant";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) notFound();

  const tenant = getTenantClient(org);
  const { data } = await tenant
    .from("portal_settings")
    .select("*")
    .limit(1)
    .single();

  const settings = data as PortalSettings | null;

  if (!settings || !settings.is_published) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <Users className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Portal is not available</p>
        <p className="text-sm text-muted-foreground">
          This organization has not published their member portal yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Hero image */}
      {settings.hero_image_url && (
        <div className="w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.hero_image_url}
            alt=""
            className="h-64 w-full object-cover sm:h-80 md:h-96"
          />
        </div>
      )}

      {/* Content */}
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-4 py-12 text-center">
        <h1 className="text-3xl font-heading font-bold">
          {settings.welcome_heading}
        </h1>

        {settings.welcome_body && (
          <p className="text-muted-foreground">{settings.welcome_body}</p>
        )}

        <Button
          size="lg"
          className="w-full text-white"
          style={{ backgroundColor: settings.accent_color }}
        >
          {settings.button_text || "Sign In"}
        </Button>

        {settings.helper_text && (
          <p className="text-xs text-muted-foreground">
            {settings.helper_text}
          </p>
        )}
      </div>
    </div>
  );
}
