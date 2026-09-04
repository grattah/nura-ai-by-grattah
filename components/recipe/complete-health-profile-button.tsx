"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useAccess } from "@/hooks/use-access";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { ANALYTICS_EVENTS, RESTRICTION_TYPES } from "@/lib/analytics/events";

export function CompleteHealthProfileButton() {
  const router = useRouter();
  const { isSubscriber, isLoading } = useAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handleClick = () => {
    if (isLoading) return;

    if (!isSubscriber) {
      setPaywallOpen(true);
      posthog.capture(ANALYTICS_EVENTS.RESTRICTION_ENCOUNTERED, {
        restriction_type: RESTRICTION_TYPES.SUBSCRIPTION_REQUIRED,
        feature: "health_profile",
      });
      return;
    }

    router.push("/health-profile");
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm text-base-text py-2 pr-3 pl-2 bg-[#F3F1E8] rounded-full self-end w-fit font-medium leading-none hover:opacity-75 transition-opacity"
      >
        Complete health profile →
      </button>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
