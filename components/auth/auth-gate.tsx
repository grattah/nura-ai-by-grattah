"use client";

import { useEffect, useRef, useState } from "react";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";

/**
 * Component-level auth gate for public pages (e.g. the recipe detail page). For
 * a guest, any click inside — except `data-paywall-passthrough` elements like
 * the back button — opens the sign-in modal; cancelling just closes it and the
 * user stays on the public page. Authenticated users pass through untouched.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAccess();
  const [signInOpen, setSignInOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const gateGuests = !isLoading && !isAuthenticated;

  useEffect(() => {
    if (!gateGuests) return;
    const el = wrapperRef.current;
    if (!el) return;

    const handleCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-paywall-passthrough]")) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      setSignInOpen(true);
    };

    el.addEventListener("click", handleCapture, true);
    return () => el.removeEventListener("click", handleCapture, true);
  }, [gateGuests]);

  return (
    <>
      <div ref={wrapperRef}>{children}</div>
      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </>
  );
}
