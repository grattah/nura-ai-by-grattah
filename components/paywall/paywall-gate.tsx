"use client";

import { useEffect, useRef, useState } from "react";
import { useAccess } from "@/hooks/use-access";
import { PaywallModal } from "./paywall-modal";

interface PaywallGateProps {
  children: React.ReactNode;
}

export function PaywallGate({ children }: PaywallGateProps) {
  const { hasAccess, isLoading } = useAccess();
  const [modalOpen, setModalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showOverlay = !isLoading && !hasAccess;

  useEffect(() => {
    if (!showOverlay) return;

    const el = wrapperRef.current;
    if (!el) return;

    const handleCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.closest("[data-paywall-passthrough]")) return;

      e.stopImmediatePropagation();
      e.preventDefault();
      setModalOpen(true);
    };

    el.addEventListener("click", handleCapture, true);
    return () => el.removeEventListener("click", handleCapture, true);
  }, [showOverlay]);

  return (
    <>
      <div ref={wrapperRef} className="relative">
        {children}

        {showOverlay && (
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-background to-transparent pointer-events-none" />
        )}
      </div>

      {/* Fixed: was onOpenChange={() => setModalOpen(true)} which never closed */}
      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
