"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";
import { backOrHome } from "@/lib/navigation";
import { ANALYTICS_EVENTS, RESTRICTION_TYPES } from "@/lib/analytics/events";

// Public routes — everything else requires authentication. Exact matches and
// prefix matches (trailing "/") are both supported.
const PUBLIC_EXACT = new Set<string>([
  "/",
  "/categories", // the index is public; /categories/[slug] is protected
  "/find-recipe",
  "/terms-and-privacy",
  "/log-back-in",
  "/return",
  "/buy-tokens/return",
  "/health-policy",
  "/help-and-guidance",
]);

const PUBLIC_PREFIXES = [
  "/recipes/", // recipe detail is public (its premium bits gate via AuthGate)
  "/auth/", // login / sign-up / error / callback …
  "/admin", // admin has its own separate auth gate
  "/landing",
  "/health-profile", // wizard is guest-accessible end-to-end; Save gates itself
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Global page-level auth gate. On a protected route, a guest lands on the page
 * (no redirect) with the sign-in overlay on top; cancelling returns them back.
 * Mounted once, inside AccessProvider, in the root layout.
 */
export function RouteAuthGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAccess();
  const blocked = !isLoading && !isAuthenticated && !isPublic(pathname);

  useEffect(() => {
    if (!blocked) return;
    posthog.capture(ANALYTICS_EVENTS.RESTRICTION_ENCOUNTERED, {
      restriction_type: RESTRICTION_TYPES.AUTH_REQUIRED,
      surface: pathname,
    });
  }, [blocked, pathname]);

  if (isLoading || isAuthenticated || isPublic(pathname)) return null;
  // Modal only (no opaque cover) — the page's own content shows behind, blurred
  // by the modal's backdrop. Cancelling returns the user to where they came from.
  return <SignInModal onClose={() => backOrHome(router)} />;
}
