"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";
import { RecipePaywallGate } from "@/components/recipe/RecipePaywallGate";
import { PaywallModal } from "../paywall/paywall-modal";
import { ANALYTICS_EVENTS, RESTRICTION_TYPES } from "@/lib/analytics/events";

/**
 * Component-level auth gate for public pages (e.g. the recipe detail page). For
 * a guest, any click inside — except `data-paywall-passthrough` elements like
 * the back button — opens the sign-in modal; cancelling just closes it and the
 * user stays on the public page. Authenticated users pass through untouched.
 */
export function AuthGate({ children, popular }: { children: React.ReactNode, popular: boolean }) {
  const { isAuthenticated, isLoading, isSubscriber } = useAccess();
  const [signInOpen, setSignInOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const gateGuests = !isLoading && !isAuthenticated;
  const gateNonSubscribers = !isLoading && isAuthenticated && !isSubscriber;

  useEffect(() => {
    if (!gateGuests && !gateNonSubscribers) return;
    if (popular) return;
    const el = wrapperRef.current;
    if (!el) return;

    const handleCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-paywall-passthrough]")) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (gateGuests) {
        setSignInOpen(true);
        posthog.capture(ANALYTICS_EVENTS.RESTRICTION_ENCOUNTERED, {
          restriction_type: RESTRICTION_TYPES.AUTH_REQUIRED,
        });
      } else {
        setSubscribeOpen(true);
        posthog.capture(ANALYTICS_EVENTS.RESTRICTION_ENCOUNTERED, {
          restriction_type: RESTRICTION_TYPES.SUBSCRIPTION_REQUIRED,
        });
      }
    };

    el.addEventListener("click", handleCapture, true);
    return () => el.removeEventListener("click", handleCapture, true);
  }, [gateGuests, gateNonSubscribers]);

  return (
    <>
      <div ref={wrapperRef}>{children}</div>
      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
      {subscribeOpen && (
        <PaywallModal open={subscribeOpen} onOpenChange={setSubscribeOpen} />
      )}
    </>
  );
}
