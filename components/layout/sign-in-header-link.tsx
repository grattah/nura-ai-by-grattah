"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withNextParam } from "@/lib/navigation";

/**
 * The header's guest "Sign in" link. Forwards along the page's own `next`
 * param (e.g. /landing?next=/recipes/xyz) so signing in from here still
 * returns the visitor to whatever gated page sent them to /landing.
 */
export function SignInHeaderLink({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const href = withNextParam("/auth/login", searchParams.get("next"));

  return (
    <Link href={href} className={className}>
      Sign in
    </Link>
  );
}
