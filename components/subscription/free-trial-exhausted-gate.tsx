"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { backOrHome } from "@/lib/navigation";
import { ANALYTICS_EVENTS, RESTRICTION_TYPES } from "@/lib/analytics/events";

/** Opens the paywall for free users who have used every trial. */
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
