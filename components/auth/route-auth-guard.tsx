"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";
import { backOrHome } from "@/lib/navigation";

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

  if (isLoading || isAuthenticated || isPublic(pathname)) return null;
  return <SignInModal onClose={() => backOrHome(router)} />;
}
