"use client";

import { useState } from "react";
import { useAccess } from "@/hooks/use-access";
import { PaywallModal } from "./paywall-modal";

interface InteractionGuardProps {
  children: React.ReactNode;
}

export function InteractionGuard({ children }: InteractionGuardProps) {
  const { hasAccess, isLoading } = useAccess();
  const [modalOpen, setModalOpen] = useState(false);

  const showOverlay = !isLoading && !hasAccess;

  return (
    <>
      <div className="relative">
        <div className={showOverlay ? "pointer-events-none select-none" : ""}>
          {children}
        </div>

        {showOverlay && (
          <>
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={() => setModalOpen(true)}
              aria-label="Unlock full access"
            />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-background to-transparent z-10 pointer-events-none" />
          </>
        )}
      </div>

      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
