"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Zap, Check } from "lucide-react";
import { BUNDLES, formatPrice, type CreditBundle } from "@/lib/credits";
import { createCreditCheckout } from "@/actions/credits-checkout";
import { CheckoutEmbed } from "@/components/checkout-embed";

type Step = "select" | "payment";

export function BuyCreditsFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<CreditBundle>(
    BUNDLES.find((b) => b.mostBought) ?? BUNDLES[0],
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== "payment" || clientSecret) return;
    setError(null);
    createCreditCheckout(selected.id)
      .then((result) => {
        if ("error" in result) setError(result.error);
        else setClientSecret(result.clientSecret);
      })
      .catch(() => setError("Failed to start payment. Please try again."));
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaymentBack = () => {
    setError(null);
    setClientSecret(null);
    setStep("select");
  };

  return (
    <div className="min-h-dvh bg-background pb-10">
      {step === "select" && (
        <>
          <div className="flex items-center justify-between px-4 pt-5 pb-4 mb-2">
            <button
              onClick={() => router.back()}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
            <p className="text-lg font-semibold text-foreground">Add credits</p>
            <button
              onClick={() => router.push("/")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="px-4 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground leading-tight">
                Top up your credits
              </h1>
              <p className="text-sm text-muted-foreground">
                Credits are spent on searches, follow-up questions and new
                recipes. They never expire — leftover credits always carry over.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {BUNDLES.map((bundle) => {
                const isSelected = selected.id === bundle.id;
                return (
                  <div className="relative" key={bundle.id}>
                    {bundle.mostBought && (
                      <span
                        className="text-xs font-semibold px-3 z-0 py-1 pb-3.5 rounded-t-md text-white absolute -top-5 left-0"
                        style={{ backgroundColor: "var(--mint-green)" }}
                      >
                        MOST BOUGHT
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelected(bundle)}
                      className={`w-full z-10 relative text-left rounded-2xl p-4 border-2 bg-card transition-all ${
                        isSelected ? "border-mint-green" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-mint-green" : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-mint-green" />
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground flex items-center gap-1.5">
                              <Zap size={16} className="text-mint-green" />
                              {bundle.credits} credits
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {bundle.blurb}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-bold text-foreground">
                            {formatPrice(bundle.amount)}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep("payment")}
              className="w-full flex items-center justify-center py-4 rounded-full text-white font-semibold text-base hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "var(--mint-green)" }}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === "payment" && (
        <>
          <div className="flex items-center justify-between px-4 pt-5 pb-4 mb-7">
            <button
              onClick={handlePaymentBack}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
            <p className="text-lg font-semibold text-foreground">
              Complete purchase
            </p>
            <button
              onClick={() => router.push("/")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="px-4 space-y-4">
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl border"
              style={{
                borderColor: "var(--mint-green)",
                backgroundColor: "#E6F4EC",
              }}
            >
              <div className="flex items-center gap-2">
                <Check size={18} className="text-mint-green" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selected.credits} credits
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.blurb} • never expire
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatPrice(selected.amount)}
              </p>
            </div>

            {error ? (
              <p className="text-sm text-red-500 text-center">{error}</p>
            ) : !clientSecret ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              </div>
            ) : (
              <CheckoutEmbed clientSecret={clientSecret} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
