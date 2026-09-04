"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { backOrHome } from "@/lib/navigation";
import { ANALYTICS_EVENTS, RESTRICTION_TYPES } from "@/lib/analytics/events";

/**
 * A free user who has spent every free trial lands on the membership page with
 * the "Get Nuko+" paywall already open over it — the page stays visible behind
 * so they can see what they're upgrading to. Dismissing returns them to wherever
 * they came from (the account page in the usual flow), falling back to home when
 * there's no in-app history.
 *
 * Mirrors HealthProfilePaywallGate; the modal itself is the shared PaywallModal.
 */
export function FreeTrialExhaustedGate({
  exhausted,
  children,
}: {
  exhausted: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!exhausted) return;
    posthog.capture(ANALYTICS_EVENTS.RESTRICTION_ENCOUNTERED, {
      restriction_type: RESTRICTION_TYPES.FREE_TRIAL_EXHAUSTED,
    });
  }, [exhausted]);

  if (!exhausted) return <>{children}</>;

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
