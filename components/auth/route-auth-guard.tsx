"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";
import { backOrHome } from "@/lib/navigation";
import { ANALYTICS_EVENTS, RESTRICTION_TYPES } from "@/lib/analytics/events";

const PUBLIC_EXACT = new Set<string>([
  "/",
  "/categories",
  "/find-recipe",
  "/terms-and-privacy",
  "/log-back-in",
  "/return",
  "/buy-tokens/return",
  "/health-policy",
  "/help-and-guidance",
]);

const PUBLIC_PREFIXES = [
  "/recipes/",
  "/auth/",
  "/admin",
  "/landing",
  "/health-profile", // wizard is guest-accessible end-to-end; Save gates itself
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Global page-level auth gate. */
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
  return <SignInModal onClose={() => backOrHome(router)} />;
}
