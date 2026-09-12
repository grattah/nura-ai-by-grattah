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
    inside_tip: string;
  };
  ingredients: { label: string; emoji: string }[];
  howToMake: { step: string; instruction: string }[];
  nutrition: NutritionFacts | null;
  popular: boolean;
  precautions?: IngredientPrecaution[];
}

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

  const lockIcon = isLoading ? null : isSubscriber || popular ? (
    <></>
  ) : (
    <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
  );

  return (
    <Accordion type="multiple" defaultValue={[]} className="space-y-3">
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
              precautions.map((entry) => (
                <p
                  key={entry.ingredientId}
                  className="text-base text-[#57605E] leading-relaxed"
                >
                  {precautionProse(entry.profile)}
                </p>
              ))
            )}
            <p className="text-xs text-[#9CA5A3] leading-relaxed pt-1">
              General information only — not medical advice. Check with your
              doctor if you take medication or have a health condition.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

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
