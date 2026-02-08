import { NextResponse, type NextRequest } from "next/server";

/**
 * Extracts the org slug from the hostname for subdomain routing.
 *
 * Production:  olympia-gardens.sgscore.com → orgSlug = "olympia-gardens"
 * Development: Falls back to path-based routing (no rewrite needed).
 */
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // In production, extract slug from subdomain
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "sgscore.com";

  if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
    const orgSlug = hostname.replace(`.${baseDomain}`, "");

    // Rewrite: olympia-gardens.sgscore.com/tickets → /olympia-gardens/tickets
    if (!url.pathname.startsWith(`/${orgSlug}`)) {
      url.pathname = `/${orgSlug}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
