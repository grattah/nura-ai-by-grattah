"use client";

import { APP_CURRENCY, APP_LOCALE } from "@/constants";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MoveRight,
  X,
  Infinity as InfinityIcon,
} from "lucide-react";
import { IoMdLock } from "react-icons/io";

import BackButton from "@/components/back-button";
import Link from "next/link";
import { createTokenCheckout } from "@/actions/credits-checkout";
import { CheckoutEmbed } from "@/components/checkout-embed";

type Bundle = {
  id: string;
  label: string;
  tokens: number;
  price: number;
  badge?: string; // optional — present only on featured bundles
};

const BUNDLES: readonly Bundle[] = [
  { id: "starter", label: "STARTER", tokens: 50, price: 1.99 },
  {
    id: "popular",
    label: "POPULAR",
    tokens: 150,
    price: 4.99,
    badge: "MOST BOUGHT",
  },
  { id: "value", label: "VALUE", tokens: 350, price: 9.99 },
  { id: "power", label: "POWER", tokens: 800, price: 19.99 },
] as const;

type Step = "select" | "review" | "card";

const money = (n: number) =>
  new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY.toUpperCase(),
  }).format(n);

export default function BuyTokens() {
  const [step, setStep] = useState<Step>("select");
  // Default the selection to the popular bundle, matching the mockup's pre-selected radio.
  const [selected, setSelected] = useState<Bundle>(
    BUNDLES.find((b) => b.id === "popular")!,
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create the Stripe session when the user reaches the card step. The server
  // resolves the real price from the bundle id (never trusts the client price).
  useEffect(() => {
    if (step !== "card" || clientSecret) return;
    setError(null);
    createTokenCheckout(selected.id)
      .then((res) => {
        if ("error" in res) setError(res.error);
        else setClientSecret(res.clientSecret);
      })
      .catch(() => setError("Failed to start payment. Please try again."));
  }, [step, clientSecret, selected.id]);

  // Re-selecting a bundle invalidates any prepared session.
  const handleSelect = (b: Bundle) => {
    setSelected(b);
    setClientSecret(null);
  };

  const title =
    step === "select"
      ? "Buy extra tokens"
      : step === "review"
        ? "Review"
        : "Continue payment";
  const subtitle =
    step === "select"
      ? "For personalized feedbacks"
      : step === "card"
        ? "Enter card details"
        : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header — back arrow is step-aware */}
      <div
        className={`px-6 py-4.75 ${
          step === "select"
            ? "bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]"
            : "bg-inherit"
        }`}
      >
        <div className="flex items-center gap-3">
          {step === "select" ? (
            <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          ) : step === "review" ? (
            <button
              className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity"
              onClick={() => setStep("select")}
            >
              <ArrowLeft size={16} color="#1B1D1D" className="" />
            </button>
          ) : step === "card" ? (
            <button
              className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity"
              onClick={() => setStep("review")}
            >
              <ArrowLeft size={16} color="#1B1D1D" className="" />
            </button>
          ) : null}

          <div className={`flex-1 text-center ${step !== "card" && "pr-9"}`}>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="text-sm text-subtle">{subtitle}</p>}
          </div>

          {step === "card" && (
            <Link
              href="/"
              className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity"
            >
              <X size={16} color="#1B1D1D" className="" />
            </Link>
          )}
        </div>
      </div>

      <main className="flex-1 px-6 pb-6 flex flex-col">
        {step === "select" && (
          <SelectStep
            selected={selected}
            onSelect={handleSelect}
            onContinue={() => setStep("review")}
          />
        )}
        {step === "review" && (
          <ReviewStep bundle={selected} onContinue={() => setStep("card")} />
        )}
        {step === "card" && (
          <CardStep
            bundle={selected}
            clientSecret={clientSecret}
            error={error}
          />
        )}
      </main>
    </div>
  );
}

function SelectStep({
  selected,
  onSelect,
  onContinue,
}: {
  selected: Bundle;
  onSelect: (b: Bundle) => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-subtle uppercase tracking-wider mb-5">
        Choose a bundle
      </p>

      <div className="grid grid-cols-2 gap-3 gap-y-10">
        {BUNDLES.map((bundle) => {
          const active = selected.id === bundle.id;
          return (
            <button
              key={bundle.id}
              onClick={() => onSelect(bundle)}
              className={`relative text-left transition-colors ${
                active ? "border-[#227B6F]" : ""
              }`}
            >
              {/* Badge: lower z-index, tucked behind the card body. Sits above the
      top edge so only its protruding part shows. */}
              {bundle.badge && (
                <span className="absolute -top-5 left-0 z-0 bg-[#227B6F] text-white text-xs font-semibold px-3 pt-1 pb-4 rounded-t-[8px]">
                  {bundle.badge}
                </span>
              )}

              <div
                className={`relative z-10 rounded-2xl border bg-[#E8E6DC] overflow-hidden ${
                  active ? "border-[#227B6F]" : "border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-3 px-2 pt-3">
                  <span className="text-xs font-medium text-subtle uppercase">
                    {bundle.label}
                  </span>
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      active ? "border-[#227B6F]" : "border-[#9CA5A3]"
                    }`}
                  >
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-[#227B6F]" />
                    )}
                  </span>
                </div>
                <p className="text-xl font-bold text-[#111312] px-2 pb-3">
                  {bundle.tokens}{" "}
                  <span className="text-xs font-medium text-[#57605E]">
                    tokens
                  </span>
                </p>
                <div
                  className={`${
                    active ? "bg-mint-green" : "bg-[#6E7E79]"
                  } text-white text-base font-medium w-full py-2 justify-center flex gap-2 items-center`}
                >
                  <p>Buy</p>
                  <MoveRight size={14} color="#FFFFFF" />
                  <p>{money(bundle.price)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl bg-white py-3 px-4 flex gap-1">
        <InfinityIcon size={20} className="text-[#227B6F] shrink-0 mt-0.5" />
        <p className="text-sm text-[#57605E] font-medium">
          <span className="text-[#1B1D1D]">Extra tokens never expire.</span>{" "}
          They stay in your account and will be used whenever your free weekly
          tokens finish.
        </p>
      </div>

      <div className="mt-20 pt-6">
        <button
          onClick={onContinue}
          className="w-full bg-[#227B6F] text-white font-medium rounded-full py-4 hover:opacity-90 transition-opacity"
        >
          Buy {selected.tokens} tokens → {money(selected.price)}
        </button>
        <p className="text-center mt-3 flex items-center justify-center gap-0.75">
          <IoMdLock size={12} color="#82A198" />{" "}
          <span className="text-sm text-[#57605E]">
            Secure checkout • No subscription
          </span>
        </p>
      </div>
    </div>
  );
}

function ReviewStep({
  bundle,
  onContinue,
}: {
  bundle: Bundle;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl bg-[#E8E6DC] py-6 px-4 flex flex-col gap-[23px]">
        <p className="font-semibold text-[#111312] mb-4">Order summary</p>
        <div className="flex flex-col gap-3">
          <Row
            label="Credits purchased"
            value={`${bundle.tokens} (${bundle.label.toLowerCase()} bundle)`}
          />
          <div className="border-t border-[#0000000A] w-[95%]" />
          <Row label="Price" value={money(bundle.price)} />
          <div className="border-t border-[#0000000A] w-[95%]" />
          <Row
            label="Total"
            value={`${money(bundle.price)} / ${bundle.tokens} credits`}
            bold
          />
          <p className="text-xs text-[#57605E]">Added instantly</p>
        </div>
      </div>

      <div className="mt-10 pt-6">
        <button
          onClick={onContinue}
          className="w-full bg-[#227B6F] text-white font-medium rounded-full py-4 hover:opacity-90 transition-opacity"
        >
          Pay {money(bundle.price)}
        </button>
        <p className="text-center mt-3 flex items-center justify-center gap-0.75">
          <IoMdLock size={12} color="#82A198" />{" "}
          <span className="text-sm text-[#57605E]">
            Secure checkout • No subscription
          </span>
        </p>
      </div>
    </>
  );
}

function CardStep({
  bundle,
  clientSecret,
  error,
}: {
  bundle: Bundle;
  clientSecret: string | null;
  error: string | null;
}) {
  return (
    <>
      <div className="rounded-2xl border border-[#227B6F] bg-[#E6F4EB] px-4 py-3 mt-2 flex items-center">
        <div className="flex-1 flex flex-col gap-1">
          <p className="font-semibold text-sm">Nuko Tokens</p>
          <p className="text-xs font-medium">Personalized feedbacks</p>
        </div>

        <div className="text-end">
          <p className="text-xl font-semibold">{money(bundle.price)}</p>
          <p className="text-sm font-medium">{bundle.tokens} tokens</p>
        </div>
      </div>

      <div className="mt-6">
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
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`text-base ${
          bold ? "font-semibold text-[#1B1D1D]" : "text-subtle"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-base ${
          bold ? "font-semibold text-[#1B1D1D]" : "text-subtle font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
