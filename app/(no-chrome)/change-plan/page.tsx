"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "annual" as const,
    label: "Annual",
    price: "£79",
    per: "/ year",
    description: "Save £16.9, billed yearly.",
    badge: "BEST VALUE",
  },
  {
    id: "monthly" as const,
    label: "Monthly",
    price: "£7.99",
    per: "/ month",
    description: "Billed monthly.",
    badge: null,
  },
];

const FEATURES = [
  { title: "See the highest-scoring recipes", subtitle: "Based on your needs" },
  { title: "10,000+ wellness recipes", subtitle: "with expert tips" },
  { title: "Personalized nutrient guidance", subtitle: "Tailored to you" },
];

export default function ChangePlanPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"annual" | "monthly">("annual");

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-10">
        <button
          onClick={() => router.back()}
          className="size-10 shrink-0 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </button>

        <h1 className="flex-1 text-xl font-semibold text-base-text text-center">
          Change plan
        </h1>
      </div>

      <div className="px-4 space-y-5">
        <div>
          <p className="text-xl font-semibold text-base-text leading-snug">
            Change your Subscription Plan
          </p>
          <p className="text-base text-subtle mt-1.75">
            You won&apos;t be charged until your current one expires
          </p>
        </div>

        {/* Plan options */}
        <div className="space-y-3 mt-9">
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <div className="relative" key={plan.id}>
                {plan.badge && (
                  <span
                    className="text-sm font-semibold px-3 z-0 py-1 pb-3.5 rounded-t-md text-white absolute -top-6"
                    style={{ backgroundColor: "var(--mint-green)" }}
                  >
                    {plan.badge}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(plan.id)}
                  className={`w-full z-10 relative text-left rounded-2xl p-4 border-2 transition-all ${
                    isSelected
                      ? "border-mint-green bg-card"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? "border-mint-green" : "border-border"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-mint-green" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-semibold text-foreground">
                            {plan.label}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col">
                      <span className="text-2xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        {plan.per}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Features */}
        <div className="bg-grey-c100 rounded-2xl p-4 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <Check
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "var(--mint-green)" }}
                strokeWidth={2.5}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {f.title}
                </p>
                <p className="text-xs text-muted-foreground">{f.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Continue */}
        <div className="space-y-2 pt-2">
          <Link
            href={`/review-order?plan=${selected}`}
            className="w-full flex items-center justify-center py-4 rounded-full text-white font-semibold text-base"
            style={{ backgroundColor: "var(--mint-green)" }}
          >
            Continue
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            🔒 Secure checkout • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
