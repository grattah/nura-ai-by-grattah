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
import iconNutritionalValue from "@/public/iconNutritionalValue.svg";
import iconIngredients from "@/public/ingredients.svg";
import iconHTMI from "@/public/HTMI.svg";
import iconWIW from "@/public/WIW.svg";
import { FaInfoCircle } from "react-icons/fa";
import { LockKeyhole, LockKeyholeOpen, CircleAlert } from "lucide-react";
import {
  precautionProse,
  type IngredientPrecaution,
} from "@/lib/precautions/types";

interface AccordionSectionProps {
  recipe: {
    why_it_works: string;
    /** Per-ingredient breakdown; null on rows generated before QA ⑪. */
    inside_tip: string;
  };
  ingredients: { label: string; emoji: string }[];
  howToMake: { step: string; instruction: string }[];
  nutrition: NutritionFacts | null;
  popular: boolean;
  /** PRD §5 — one block per qualifying ingredient; [] renders the empty state. */
  precautions?: IngredientPrecaution[];
}

/** Split copy on blank lines; a single block stays a single paragraph. */
const paragraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

const AccordionSection = ({
  recipe,
  ingredients,
  howToMake,
  nutrition,
  popular,
  precautions = [],
}: AccordionSectionProps) => {
  const { isSubscriber, isLoading } = useAccess();

  // const lockIcon = isLoading ? null : isSubscriber || popular ? (
  //   <></>
  // ) : (
  //   <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
  // );

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

            {/* {lockIcon} */}
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
            {/* {lockIcon} */}
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
            {/* {lockIcon} */}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          {/* Prose, not a per-ingredient breakdown. The structured
              earlier per-ingredient rendering gave each ingredient its own
              heading, which fragmented what reads better as continuous
              explanation. The 3-5 functions per ingredient are still required
              (QA ⑪) — they are carried in the prose. Paragraphs are
              split on blank lines so the copy keeps its intended spacing
              instead of collapsing into one block. */}
          <div className="bg-[#F2F6F5] p-4 rounded-lg space-y-4">
            {paragraphs(recipe.why_it_works).map((para, i) => (
              <p
                key={i}
                className="text-base text-[#57605E] leading-relaxed"
              >
                {para}
              </p>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 5 — Precautions (PRD-4 §5). Always rendered: an empty tab is
          reassuring, a missing tab reads as "we didn't check". Informational
          only — unlike an allergy exclusion it never blocks access, so no
          paywall lock here. */}
      <AccordionItem
        value="precautions"
        data-paywall-passthrough
        className="border-0 rounded-xl overflow-hidden bg-white"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center gap-2.5">
            <CircleAlert size={20} className="text-[#57605E] shrink-0" />
            <span className="text-base font-medium text-base-text">
              Precautions
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          <div className="bg-[#F4F4F2] p-4 rounded-lg space-y-4">
            {precautions.length === 0 ? (
              <p className="text-base text-[#57605E] leading-relaxed">
                No specific usage precautions for this recipe&apos;s ingredients.
              </p>
            ) : (
              // Prose only — no ingredient heading. The three answers are
              // written as self-contained sentences (§4.1), so they read as one
              // paragraph, and the section gets the same treatment as "Why it
              // works" above rather than looking like a form.
              //
              // Measured before removing the heading: 123 of 132 profiles (93%)
              // open by naming their own ingredient — "Ground cinnamon is safe
              // daily…" — so for almost all of them the heading was repeating
              // the first three words of the sentence beneath it.
              //
              // The remaining ~7% open without naming themselves ("Typical
              // doses of 300–600 mg daily appear well tolerated…"). One
              // paragraph per ingredient keeps them separable, and the fix for
              // those is in the copy, not the layout — the §4.1 prompt should
              // require the opening sentence to name the ingredient.
              precautions.map((entry) => (
                <p
                  key={entry.ingredientId}
                  className="text-base text-[#57605E] leading-relaxed"
                >
                  {precautionProse(entry.profile)}
                </p>
              ))
            )}
            {/* No "Sources:" line — PRD-4 removed live search, so there is
                nothing verifiable to cite and an unverifiable one would only
                lend borrowed authority. */}
            <p className="text-xs text-[#9CA5A3] leading-relaxed pt-1">
              General information only — not medical advice. Check with your
              doctor if you take medication or have a health condition.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* 6 — Inside Tip */}
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
            {/* {lockIcon} */}
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
