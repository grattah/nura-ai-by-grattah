"use client";
import { useState } from "react";
import { PaywallModal } from "../paywall/paywall-modal";
import { CoinAnimation } from "./CoinAnimation";

export default function NoTokensYet() {
  const [paywallOpen, setPaywallOpen] = useState(false);

  return (
    <div className="flex flex-col gap-y-5.5 items-center justify-center mt-14 mx-9">
      <div className="flex flex-col gap-y-3 items-center text-center">
        <div className="bg-[#FFF7EC] rounded-full size-18 grid place-items-center">
          <CoinAnimation />
        </div>
        <p className="font-semibold text-base-text leading-none text-title">
          No tokens yet
        </p>
        <p className="font-medium text-base text-subtle">
          Subscribe to Nuko+ to get weekly tokens and keep discovering new
          recipes.
        </p>
      </div>
      <button
        onClick={() => setPaywallOpen(true)}
        className="w-full rounded-full bg-mint-green py-4 text-white font-medium leading-none text-base"
      >
        Get Nuko+
      </button>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}
