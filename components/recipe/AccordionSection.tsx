"use client";

import Image from "next/image";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAccess } from "@/hooks/use-access";
import type { NutritionFacts } from "@/lib/types";
import { parseWhyItWorksDetail } from "@/lib/recipe-copy";
import iconNutritionalValue from "@/public/iconNutritionalValue.svg";
import iconIngredients from "@/public/ingredients.svg";
import iconHTMI from "@/public/HTMI.svg";
import iconWIW from "@/public/WIW.svg";
import { FaInfoCircle } from "react-icons/fa";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";

interface AccordionSectionProps {
  recipe: {
    why_it_works: string;
    /** Per-ingredient breakdown; null on rows generated before QA ⑪. */
    why_it_works_detail?: unknown;
    inside_tip: string;
  };
  ingredients: { label: string; emoji: string }[];
  howToMake: { step: string; instruction: string }[];
  nutrition: NutritionFacts | null;
  popular: boolean;
}

const AccordionSection = ({
  recipe,
  ingredients,
  howToMake,
  nutrition,
  popular,
}: AccordionSectionProps) => {
  // Rows generated before QA ⑪ have no structured breakdown — fall back to the
  // prose rather than showing an empty section.
  const whyDetail = parseWhyItWorksDetail(recipe.why_it_works_detail);

  const { isSubscriber, isLoading } = useAccess();

  const lockIcon = isLoading ? null : isSubscriber || popular ? (
    <></>
  ) : (
    <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
  );

  return (
    <Accordion type="multiple" defaultValue={[]} className="space-y-3">
      {/* 1 — Nutritional Value (free, no paywall) */}
      {nutrition && (
        <AccordionItem
          value="nutritional-value"
          data-paywall-passthrough
          className="border-0 rounded-xl overflow-hidden bg-white"
        >
          <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
            <div className="flex items-center gap-2.5">
              <Image src={iconNutritionalValue} alt="nutritional value icon" />
              <p className="text-base font-medium text-base-text">
                Nutritional value{" "}
                <span className="text-xs text-subtle">(per serving)</span>
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-5 gap-1 rounded-xl bg-[#F2F6F5] px-3 py-4">
              {[
                { value: `${nutrition.kcal}`, label: "kcal" },
                { value: `${nutrition.protein}g`, label: "Protein" },
                { value: `${nutrition.fat}g`, label: "Sat. Fat" },
                { value: `${nutrition.carbs}g`, label: "Carbs" },
                { value: `${nutrition.fiber}g`, label: "Fiber" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center text-center"
                >
                  <span className="text-base font-semibold text-base-text">
                    {stat.value}
                  </span>
                  <span className="text-sm text-subtle">{stat.label}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* 2 — Ingredients */}
      <AccordionItem
        value="ingredients"
        className="border-0 rounded-xl overflow-hidden bg-white"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <Image src={iconIngredients} alt="ingredients icon" />
              <span className="text-base font-medium text-base-text">
                Ingredients
              </span>
            </div>

            {lockIcon}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-0">
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-4 min-h-12 bg-[#F2F6F5]"
              >
                <span className="text-lg leading-none">{ing.emoji}</span>
                <span className="text-sm font-medium text-[#000000]">
                  {ing.label}
                </span>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 3 — How to make it */}
      <AccordionItem
        value="how-to"
        className="border-0 rounded-xl overflow-hidden bg-[#FFFFFF]"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <Image src={iconHTMI} alt="HTMI icon" />
              <span className="text-base font-medium text-base-text">
                How to make it
              </span>
            </div>
            {lockIcon}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          <ol className="space-y-3 bg-[#F2F6F5] p-4 rounded-lg">
            {howToMake.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 text-base leading-relaxed text-[#57605E]"
              >
                <span className="text-base-text shrink-0 min-w-5">
                  {step.step}.
                </span>
                <span>{step.instruction}</span>
              </li>
            ))}
          </ol>
        </AccordionContent>
      </AccordionItem>

      {/* 4 — Why it works */}
      <AccordionItem
        value="why"
        className="border-0 rounded-xl overflow-hidden bg-[#FFFFFF]"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <Image src={iconWIW} alt="HTMI icon" />
              <span className="text-base font-medium text-base-text">
                Why it works
              </span>
            </div>
            {lockIcon}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          {whyDetail ? (
            <div className="bg-[#F2F6F5] p-4 rounded-lg space-y-4">
              {whyDetail.map((entry) => (
                <div key={entry.ingredient}>
                  <p className="text-base font-semibold text-base-text">
                    {entry.ingredient}
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {entry.functions.map((fn) => (
                      <li
                        key={fn}
                        className="flex gap-2 text-base text-[#57605E] leading-relaxed"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-green"
                        />
                        <span>{fn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-base text-[#57605E] leading-relaxed bg-[#F2F6F5] p-4 rounded-lg">
              {recipe.why_it_works}
            </p>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* 5 — Inside Tip */}
      <AccordionItem
        value="tip"
        className="border-0 rounded-xl overflow-hidden bg-[#EEF4FB]"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                <FaInfoCircle fill="#1558EA" size={16} />
              </div>
              <span className="text-base font-medium text-[#1B1D1D]">
                Inside Tip
              </span>
            </div>
            {lockIcon}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          <p className="text-base text-muted-foreground leading-relaxed">
            {recipe.inside_tip}
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default AccordionSection;
