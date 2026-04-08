// import { NextRequest, NextResponse } from "next/server";
// import { updateSession } from "@/lib/supabase/middleware";

// const isDev = process.env.NODE_ENV === "development";
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// const ACCOUNT_PATHS = ["/bookmarks", "/notifications"];

// export async function proxy(request: NextRequest) {
//   // ── 1. Generate a per-request nonce ─────────────────────────────────────
//   const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

//   const cspHeader = `
//     default-src 'self';
//     script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://*.js.stripe.com https://checkout.stripe.com${isDev ? " 'unsafe-eval'" : ""};
//     style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
//     connect-src 'self' ${supabaseUrl} https://api.stripe.com https://checkout.stripe.com https://maps.googleapis.com;
//     frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://checkout.stripe.com;
//     img-src 'self' blob: data: https://*.stripe.com;
//     font-src 'self';
//     object-src 'none';
//     base-uri 'self';
//     form-action 'self';
//   `
//     .replace(/\n/g, "")
//     .replace(/\s{2,}/g, " ")
//     .trim();

//   // ── 2. Forward nonce to pages via request header ─────────────────────────
//   // Pages/layouts read this via headers() to pass the nonce to <Script> tags
//   const requestHeaders = new Headers(request.headers);
//   requestHeaders.set("x-nonce", nonce);
//   requestHeaders.set("Content-Security-Policy", cspHeader);

//   // ── 3. Run Supabase session refresh (existing behaviour) ─────────────────
//   const res = await updateSession(
//     new NextRequest(request.url, {
//       headers: requestHeaders,
//       method: request.method,
//       body: request.body,
//     }),
//   );

//   // ── 4. Account-only route guard ──────────────────────────────────────────
//   const path = request.nextUrl.pathname;
//   const isAccountPath = ACCOUNT_PATHS.some((p) => path.startsWith(p));
//   if (isAccountPath) {
//     if (res.status === 307 || res.status === 302) return res;

//     const hasSession =
//       request.cookies.has("sb-access-token") ||
//       request.cookies.has(
//         `sb-${supabaseUrl.split("//")[1]?.split(".")[0]}-auth-token`,
//       );

//     if (!hasSession) {
//       return NextResponse.redirect(
//         new URL(`/auth?next=${encodeURIComponent(path)}`, request.url),
//       );
//     }
//   }

//   // ── 5. Set CSP on the response too ───────────────────────────────────────
//   res.headers.set("Content-Security-Policy", cspHeader);

//   return res;
// }

// export const config = {
//   matcher: [
//     {
//       source:
//         "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
//       missing: [
//         { type: "header", key: "next-router-prefetch" },
//         { type: "header", key: "purpose", value: "prefetch" },
//       ],
//     },
//   ],
// };

import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
