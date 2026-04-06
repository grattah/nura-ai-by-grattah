import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require a Supabase account (not just a payment token)
const ACCOUNT_PATHS = ["/bookmarks", "/notifications"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Run Supabase session refresh on every matched request (existing behaviour)
  const res = await updateSession(request);

  // Hard redirect for account-only routes if no session cookie present
  // (updateSession already handles the session; we just check the result)
  const isAccountPath = ACCOUNT_PATHS.some((p) => path.startsWith(p));
  if (isAccountPath) {
    // updateSession returns a redirect response when there's no session
    // If it didn't redirect, the user is authed — let them through
    // If it did redirect, honour it
    if (res.status === 307 || res.status === 302) return res;

    // Belt-and-braces: check for the Supabase session cookie directly
    const hasSession =
      request.cookies.has("sb-access-token") ||
      request.cookies.has(
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
      );

    if (!hasSession) {
      const redirectUrl = new URL(
        `/auth?next=${encodeURIComponent(path)}`,
        request.url,
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Premium content (recipes, risks, chat) is enforced client-side via
  // PaywallGate / InteractionGuard — no edge DB call needed

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - PWA assets (manifest, service worker, workbox chunks, offline page)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
