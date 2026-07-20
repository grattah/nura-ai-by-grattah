"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { backOrHome } from "@/lib/navigation";

/**
 * Wraps the health-profile screens for an authenticated NON-subscriber. Instead
 * of a jarring redirect, the page renders behind the "Get Nuko+" paywall so the
 * user sees where they're headed. The page itself is inert (pointer-events
 * disabled) until they subscribe; dismissing the modal returns them back.
 */
export function HealthProfilePaywallGate({
  blocked,
  children,
}: {
  blocked: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  if (!blocked) return <>{children}</>;

  return (
    <>
      <div className="pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      <PaywallModal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) backOrHome(router);
        }}
      />
    </>
  );
}
