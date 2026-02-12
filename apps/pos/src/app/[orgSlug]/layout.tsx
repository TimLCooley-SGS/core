import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrgBySlug } from "@sgscore/api";
import type { OrgBranding, PosNavItem } from "@sgscore/types";
import { DEFAULT_POS_NAV } from "@sgscore/types";
import { generateThemeCSS } from "@/lib/theme";
import { CartProvider } from "@/lib/cart-provider";
import { PosHeader } from "@/components/pos-header";
import { PosFooter } from "@/components/pos-footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await getOrgBySlug(orgSlug);
  if (!org) return {};

  const branding = (org.settings?.branding ?? {}) as Partial<OrgBranding>;

  return {
    title: org.name,
    ...(branding.faviconUrl && {
      icons: { icon: branding.faviconUrl },
    }),
  };
}

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

  const settings = (org.settings ?? {}) as Record<string, unknown>;
  const branding = (settings.branding ?? {}) as Partial<OrgBranding>;
  const posNavigation = (settings.posNavigation as PosNavItem[] | undefined) ?? DEFAULT_POS_NAV;
  const themeCSS = generateThemeCSS(branding);

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <style dangerouslySetInnerHTML={{ __html: `:root { ${themeCSS} }` }} />
        <PosHeader
          orgSlug={orgSlug}
          orgName={org.name}
          logoUrl={branding.logoUrl}
          navItems={posNavigation}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <PosFooter orgName={org.name} />
      </div>
    </CartProvider>
  );
}
