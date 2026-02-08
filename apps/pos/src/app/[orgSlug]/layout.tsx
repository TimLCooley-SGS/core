import { notFound } from "next/navigation";
import { getOrgBySlug } from "@sgscore/api";
import type { OrgBranding } from "@sgscore/types";
import { generateThemeCSS } from "@/lib/theme";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);

  if (!org) notFound();

  const branding = (org.settings?.branding ?? {}) as Partial<OrgBranding>;
  const themeCSS = generateThemeCSS(branding);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `:root { ${themeCSS} }` }} />
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt={`${org.name} logo`}
                className="h-10 w-auto"
              />
            )}
            <span className="text-xl font-heading font-bold">{org.name}</span>
          </div>
          <nav className="flex gap-6 text-sm font-medium">
            <a href={`/${orgSlug}/tickets`} className="hover:text-primary">
              Tickets
            </a>
            <a href={`/${orgSlug}/events`} className="hover:text-primary">
              Events
            </a>
            <a href={`/${orgSlug}/memberships`} className="hover:text-primary">
              Memberships
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Powered by SGS Core
      </footer>
    </div>
  );
}
