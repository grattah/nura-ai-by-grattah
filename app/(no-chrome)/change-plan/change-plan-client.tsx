"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import FilledLock from "@/components/vectors/filled-lock";

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

export function ChangePlanClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<"annual" | "monthly">("annual");

  return (
    <div className="min-h-dvh pb-10 bg-white">
      {/* Header */}
      <div className="px-6 pb-4.75 bg-background mb-4.75">
        <div className="flex items-center pt-5 pb-10 relative">
          <button
            onClick={() => router.back()}
            className="size-10 shrink-0 absolute left-0 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 text-foreground" />
          </button>

          <h1 className="flex-1 text-xl font-semibold text-base-text text-center">
            Change plan
          </h1>
        </div>
        <div>
          <p className="text-xl font-semibold text-base-text leading-snug">
            Change your Subscription Plan
          </p>
          <p className="text-base text-subtle mt-1.75">
            You won&apos;t be charged until your current one expires
          </p>
        </div>
      </div>

      <div className="px-6 space-y-8 bg-white">
        {/* Plan options */}
        <div className="space-y-6 mt-12 mb-10">
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
                      ? "border-mint-green bg-white"
                      : "border-grey-c300 bg-grey-c100"
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
        <div className="bg-grey-c100 rounded-2xl p-4 space-y-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <Check
                className="size-4 shrink-0"
                style={{ color: "var(--mint-green)" }}
                strokeWidth={2.5}
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-base-text">
                  {f.title}
                </p>
                <p className="text-sm text-subtle">{f.subtitle}</p>
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
          <div className="flex items-center justify-center text-sm text-subtle gap-2">
            <FilledLock /> <span>Secure checkout • Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
}
