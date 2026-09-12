"use client";

import { useEffect, useRef, useState } from "react";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";
import { RecipePaywallGate } from "@/components/recipe/RecipePaywallGate";
import { PaywallModal } from "../paywall/paywall-modal";

/** Component-level auth gate for public pages. */
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
      } else {
        setSubscribeOpen(true);
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
