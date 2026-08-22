"use client";

import { PLANS, type Plan } from "@/constants";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import FilledLock from "@/components/vectors/filled-lock";

// Plans come from constants/index.ts — this file used to carry its own copy.

const FEATURES = [
  {
    title: "Recipes matched to your health goals",
    subtitle:
      "Know instantly which recipes best fits your health goals/conditions.",
  },
  {
    title: "The full premium library",
    subtitle: "1,000+ curated recipes by experts.",
  },
  {
    title: "Safety ingredient flags",
    subtitle: "For allergies and medication interactions.",
  },
];

export function ChangePlanClient() {
  const router = useRouter();
  const [selected, setSelected] = useState<Plan>("annual");

  return (
    <div className="min-h-dvh pb-10">
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

      <div className="px-6 space-y-8">
        {/* Plan options */}
        <div className="space-y-4 mt-12 mb-10">
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
                  className={`w-full z-10 relative text-left rounded-xl p-3 border transition-all ${
                    isSelected
                      ? "border-mint-green bg-[#FFFCF7]"
                      : "border-[#E2E0D8] bg-[#E8E6DC]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? "border-mint-green" : "border-grey-c400"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-mint-green" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-base-text leading-5">
                          {plan.label}
                        </p>
                        <p className="text-xs text-subtle leading-5">
                          {plan.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col">
                      <span className="text-xl font-semibold text-base-text">
                        {plan.price}
                      </span>
                      <span className="text-sm text-subtle"> {plan.per}</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Features */}
        <div className="bg-[#ECECE1] rounded-2xl py-4 px-3 space-y-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <Check
                className="size-4 shrink-0"
                style={{ color: "var(--mint-green)" }}
                strokeWidth={2.5}
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-base-text leading-5">
                  {f.title}
                </p>
                <p className="text-sm text-subtle font-medium leading-4">
                  {f.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Continue */}
        <div className="space-y-2.25 pt-2">
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
