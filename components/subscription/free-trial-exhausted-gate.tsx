"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { backOrHome } from "@/lib/navigation";

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
