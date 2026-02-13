import type { Metadata } from "next";
import { getPlatformSettings } from "@sgscore/api";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | undefined;
  try {
    const settings = await getPlatformSettings();
    faviconUrl = settings.favicon_url;
  } catch {
    // Settings table may not exist yet — fall through to defaults
  }

  return {
    title: "SGS Core",
    description: "Staff administration dashboard for SGS Core organizations",
    ...(faviconUrl
      ? { icons: { icon: faviconUrl } }
      : {}),
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
