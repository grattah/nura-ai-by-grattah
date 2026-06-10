"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

const PLAN_CONFIG = {
  annual: {
    label: "Annual",
    price: "£79",
    priceLabel: "£79 / yearly",
    total: "£79 / yearly",
  },
  monthly: {
    label: "Monthly",
    price: "£7.99",
    priceLabel: "£7.99 / monthly",
    total: "£7.99 / monthly",
  },
};

function ReviewOrderContent() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = (params.get("plan") ?? "annual") as "annual" | "monthly";
  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.annual;

  const supabase = createClient();
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("expires_at, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (sub?.expires_at) setExpiresAt(sub.expires_at);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formattedExpiry = expiresAt
    ? format(new Date(expiresAt), "MMMM d, yyyy")
    : null;

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-10 relative">
        <button
          onClick={() => router.back()}
          className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </button>

        <h1 className="text-xl flex-1 text-center min-w-0 font-semibold text-base-text">
          Review
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Order summary */}
        <div className="bg-[#E8E6DC] rounded-3xl px-4 py-6 space-y-3 border border-border">
          <p className="text-base font-semibold text-foreground">
            Order summary
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-subtle">Plan</p>
              <p className="text-base-text">{config.label}</p>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <p className="text-subtle">Price</p>
              <p className="text-base-text">{config.priceLabel}</p>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-foreground">Total</p>
              <p className="text-base font-bold text-foreground">
                {config.total}
              </p>
            </div>
          </div>
          <p className="text-sm text-subtle">Cancel anytime</p>
        </div>

        {/* Deferred billing note (only if existing subscription) */}
        {formattedExpiry && (
          <div
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{ backgroundColor: "#D3E8E1" }}
          >
            <Info
              className="w-4 h-4 shrink-0 mt-0.5 text-mint-green"
              strokeWidth={1.5}
            />
            <p className="text-base font-medium text-base-text leading-relaxed">
              You won&apos;t be charged until your current plan expires on{" "}
              <span className="font-semibold">{formattedExpiry}</span>.
            </p>
          </div>
        )}

        {/* Pay button */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => router.push(`/continue-payment?plan=${plan}`)}
            className="w-full py-4 rounded-full text-white font-semibold text-base"
            style={{ backgroundColor: "var(--mint-green)" }}
          >
            Pay {config.price}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            🔒 Secure checkout • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReviewOrderClient() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <ReviewOrderContent />
    </Suspense>
  );
}
