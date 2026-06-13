"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { CheckoutEmbed } from "@/components/checkout-embed";
import { fetchClientSecretForPlan } from "@/actions/stripe";

const PLAN_LABELS: Record<
  string,
  { name: string; price: string; description: string }
> = {
  annual: {
    name: "Nuko+ (Annual)",
    price: "£79",
    description: "Save £16.9, billed yearly.",
  },
  monthly: {
    name: "Nuko+ (Monthly)",
    price: "£7.99",
    description: "Billed monthly.",
  },
};

function ContinuePaymentContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = (params.get("plan") ?? "annual") as "annual" | "monthly";
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.annual;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientSecretForPlan(plan)
      .then((result) => {
        if ("error" in result) setError(result.error);
        else setClientSecret(result.clientSecret);
      })
      .catch(() => setError("Failed to load checkout. Please try again."));
  }, [plan]);

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <button
          onClick={() => router.back()}
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Continue payment
          </p>
          <p className="text-sm text-muted-foreground">Welcome back</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Close"
        >
          <X className="size-5 text-foreground" />
        </button>
      </div>

      <div className="px-6 space-y-4">
        {/* Plan summary */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-2xl border"
          style={{
            borderColor: "var(--mint-green)",
            backgroundColor: "#E6F4EC",
          }}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              {planInfo.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {planInfo.description}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">
              {planInfo.price}
            </p>
            <p className="text-xs text-muted-foreground">/ month</p>
          </div>
        </div>

        {/* Stripe checkout */}
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
    </div>
  );
}

export function ContinuePaymentClient() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <ContinuePaymentContent />
    </Suspense>
  );
}
