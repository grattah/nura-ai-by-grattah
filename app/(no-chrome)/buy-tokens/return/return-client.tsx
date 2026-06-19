"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

// The "extra" token balance is topped up asynchronously by the Stripe webhook,
// so we poll /api/credits a few times to let it land, then show the success
// modal. The purchased amount is passed through the return URL for the copy.
export function BuyTokensReturnClient() {
  const router = useRouter();
  const params = useSearchParams();
  const credits = params.get("credits");
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        await fetch("/api/credits", { cache: "no-store" });
      } catch {
        /* ignore — we resolve regardless after a few tries */
      }
      if (attempts >= 4) {
        setDone(true);
        return;
      }
      setTimeout(poll, 1200);
    };
    poll();
  }, []);

  if (!done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Confirming your tokens…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black/40 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl px-8 py-10 w-full max-w-sm flex flex-col items-center text-center gap-4">
        <Image src="/success.svg" alt="" width={140} height={140} className="object-contain" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Payment successful!
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You&apos;re all set!{credits ? ` ${credits} tokens are` : " Your tokens are"}{" "}
            ready to use whenever you need personalized feedback!
          </p>
        </div>
        <button
          onClick={() => router.replace("/tokens")}
          className="w-full py-4 rounded-full text-white font-semibold"
          style={{ backgroundColor: "var(--mint-green)" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
