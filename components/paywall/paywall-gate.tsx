"use client";

import { useState } from "react";
import { useAccess } from "@/hooks/use-access";
import { PaywallModal } from "./paywall-modal";

interface PaywallGateProps {
  children: React.ReactNode;
}

export function PaywallGate({ children }: PaywallGateProps) {
  const { hasAccess, isLoading } = useAccess();
  const [modalOpen, setModalOpen] = useState(false);

  // While loading, render normally (avoids layout shift)
  // Once confirmed denied, overlay kicks in
  const showOverlay = !isLoading && !hasAccess;

  return (
    <>
      <div className="relative">
        {/* Render children — visible to all */}
        <div className={showOverlay ? "pointer-events-none select-none" : ""}>
          {children}
        </div>

        {/* Invisible click-catcher overlay */}
        {showOverlay && (
          <>
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={() => setModalOpen(true)}
              aria-label="Unlock full access"
            />
            {/* Bottom gradient to hint at more content */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-background to-transparent z-10 pointer-events-none" />
          </>
        )}
      </div>

      <PaywallModal open={modalOpen} onOpenChange={() => setModalOpen(true)} />
    </>
  );
}
