"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withNextParam } from "@/lib/navigation";

export function SignInHeaderLink({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const href = withNextParam("/auth/login", searchParams.get("next"));

  return (
    <Link href={href} className={className}>
      Sign in
    </Link>
  );
}
