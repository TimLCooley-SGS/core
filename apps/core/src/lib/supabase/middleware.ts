import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight auth gate for middleware — just checks if a Supabase auth cookie
 * exists. No Supabase client, no network calls, no heavy bundle.
 * Actual secure verification via getUser() happens in server components.
 */
export function updateSession(request: NextRequest) {
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  if (
    !hasAuthCookie &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
