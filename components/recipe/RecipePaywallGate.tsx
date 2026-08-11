"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import FilledLock from "../vectors/filled-lock";
import { Plan, PLANS } from "@/constants";
import { useAccess } from "@/components/providers/access-provider";
import Time from "../vectors/time";

export function RecipePaywallGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasEverSubscribed } = useAccess();
  const isTokensPage = pathname === "/tokens";

  const [open, setOpen] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");

  const handleClose = () => {
    router.back();
  };

  const benefits = [
    {
      title: "Recipes matched to your health goals",
      subtitle:
        "Know instantly which recipes best fits your health goals/conditions.",
    },
    {
      title: "The full premium library",
      subtitle: "10,000+ curated recipes by experts.",
    },
    {
      title: "Safety ingredient flags",
      subtitle: "For allergies and medication interactions.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogOverlay className="bg-white/30 backdrop-blur-xs" />
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl"
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          router.back();
        }}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          router.back();
        }}
      >
        <div className="p-6 space-y-6 mt-8">
          <button
            onClick={handleClose}
            className="absolute top-4 right-6 size-10 rounded-full bg-grey-c100 p-2 grid place-items-center hover:opacity-75 transition-opacity"
          >
            <X className="size-6 text-grey-c600" />
          </button>
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-6 gap-0">
            {!hasEverSubscribed && !isTokensPage && (
              <div className="py-1.5 px-2 rounded-lg bg-warning-c100 flex items-center gap-x-1">
                <Time />
                <span className="text-warning-c900 text-xs font-semibold">
                  Your free trial has ended
                </span>
              </div>
            )}
            <div className="space-y-3">
              <DialogTitle className="text-2xl max-[350px]:text-xl font-semibold text-black mb-3">
                Get Nuko+
              </DialogTitle>
              <Image
                alt="nuko+"
                src="/planImage.webp"
                width={150}
                height={76}
              />
            </div>
          </DialogHeader>

          <ul className="rounded-2xl bg-grey-c100 py-4 px-3 space-y-3 mb-9">
            {benefits.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <Check
                  size={16}
                  className="text-mint-green shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-base-text text-sm leading-5">
                    {item.title}
                  </p>
                  <p className="text-sm text-subtle font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-3 pt-2">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <div className="relative" key={plan.id}>
                  {plan.badge && (
                    <span
                      className="text-xs font-semibold px-3 z-0 py-1 pb-3.5 rounded-t-md text-white absolute -top-5 left-0"
                      style={{ backgroundColor: "var(--mint-green)" }}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full z-10 relative text-left rounded-xl p-3 border transition-all ${
                      isSelected
                        ? "border-mint-green bg-[#E6ECEA]"
                        : "border-grey-c200 bg-grey-c100"
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
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-base-text leading-5">
                            {plan.label}
                          </p>
                          <p className="text-xs text-subtle leading-5">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col space-y-1">
                        <span className="text-xl font-semibold text-base-text leading-5">
                          {plan.price}
                        </span>
                        <span className="text-xs text-subtle leading-5">
                          {plan.per}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              className="w-full py-4 max-[350px]:py-3 rounded-4xl bg-[#227B6F] text-[#FFFFFF] font-medium"
              onClick={() => {
                router.push(`/checkout?plan=${selectedPlan}`);
              }}
            >
              Get full access
            </button>
            <div className="flex items-center justify-center text-sm text-subtle gap-2">
              <FilledLock /> <span>Secure checkout • Cancel anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
