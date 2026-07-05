"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { fetchClientSecretForPlan } from "@/actions/stripe";
import { CheckoutEmbed } from "@/components/checkout-embed";
import BackButton from "./back-button";
import { PLAN_LABELS, type Plan } from "@/constants";

interface CheckoutFlowProps {
  user: { id: string; email: string } | null;
  plan: Plan;
}

export function CheckoutFlow({ plan }: CheckoutFlowProps) {
  const router = useRouter();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planInfo = PLAN_LABELS[plan];
  const per = plan === "monthly" ? "/ month" : "/ year";

  // Create the embedded Stripe session for the selected plan.
  useEffect(() => {
    let cancelled = false;
    fetchClientSecretForPlan(plan)
      .then((res) => {
        if (cancelled) return;
        if ("error" in res) setError(res.error);
        else setClientSecret(res.clientSecret);
      })
      .catch(() => {
        if (!cancelled)
          setError("Failed to start payment. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [plan]);

  return (
    <div className="min-h-dvh bg-background pb-10">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 mb-7">
        <BackButton
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Back"
        />
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
            <p className="text-xs text-muted-foreground">{per}</p>
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
