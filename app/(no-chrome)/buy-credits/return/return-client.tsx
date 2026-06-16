"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// The credit balance is topped up asynchronously by the Stripe webhook, so we
// poll /api/credits a few times to let it land before sending the user to their
// credits page (which then shows the fresh balance + the new purchase entry).
export function BuyCreditsReturnClient() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        await fetch("/api/credits", { cache: "no-store" });
      } catch {
        /* ignore — we navigate regardless after a few tries */
      }
      if (attempts >= 4) {
        router.replace("/account/credits");
        return;
      }
      setTimeout(poll, 1200);
    };

    poll();
  }, [router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">Confirming your credits…</p>
    </div>
  );
}
