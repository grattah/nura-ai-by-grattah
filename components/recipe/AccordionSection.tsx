"use client";

import Image from "next/image";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAccess } from "@/hooks/use-access";
import iconIngredients from "@/public/ingredients.png";
import iconHTMI from "@/public/HTMI.png";
import iconWIW from "@/public/WIW.png";
import { FaInfoCircle } from "react-icons/fa";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";

interface AccordionSectionProps {
  recipe: {
    why_it_works: string;
    inside_tip: string;
  };
  ingredients: { label: string; emoji: string }[];
  howToMake: { step: string; instruction: string }[];
}

const AccordionSection = ({
  recipe,
  ingredients,
  howToMake,
}: AccordionSectionProps) => {
  const { hasAccess, isLoading } = useAccess();

  return (
    <Accordion type="multiple" defaultValue={[]} className="space-y-3">
      {/* 1 — Ingredients */}
      <AccordionItem
        value="ingredients"
        className="border-0 rounded-lg overflow-hidden bg-[#FFFFFF]"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <Image src={iconIngredients} alt="ingredients icon" />
              <span className="text-base font-medium text-black/80">
                Ingredients
              </span>
            </div>

            {hasAccess ? (
              <LockKeyholeOpen size={20} color="#9CA5A3" className="ml-auto" />
            ) : (
              <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
            )}
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

      {/* 2 — How to make it */}
      <AccordionItem
        value="how-to"
        className="border-0 rounded-lg overflow-hidden bg-[#FFFFFF]"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <Image src={iconHTMI} alt="HTMI icon" />
              <span className="text-base font-medium text-foreground">
                How to make it
              </span>
            </div>
            {hasAccess ? (
              <LockKeyholeOpen size={20} color="#9CA5A3" className="ml-auto" />
            ) : (
              <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          <ol className="space-y-3 bg-[#F2F6F5] p-4 rounded-lg">
            {howToMake.map((step, i) => (
              <li
                key={i}
                className="flex gap-3 text-base leading-relaxed text-[#57605E]"
              >
                <span className="text-foreground shrink-0 min-w-5">
                  {step.step}.
                </span>
                <span>{step.instruction}</span>
              </li>
            ))}
          </ol>
        </AccordionContent>
      </AccordionItem>

      {/* 3 — Why it works */}
      <AccordionItem
        value="why"
        className="border-0 rounded-lg overflow-hidden bg-[#FFFFFF]"
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
          <div className="flex items-center justify-between flex-1">
            <div className="flex items-center gap-2.5">
              <Image src={iconWIW} alt="HTMI icon" />
              <span className="text-base font-medium text-foreground">
                Why it works
              </span>
            </div>
            {hasAccess ? (
              <LockKeyholeOpen size={20} color="#9CA5A3" className="ml-auto" />
            ) : (
              <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-5 pt-0">
          <p className="text-base text-[#57605E] leading-relaxed bg-[#F2F6F5] p-4 rounded-lg">
            {recipe.why_it_works}
          </p>
        </AccordionContent>
      </AccordionItem>

      {/* 4 — Inside Tip */}
      <AccordionItem
        value="tip"
        className="border-0 rounded-lg overflow-hidden bg-[#EEF4FB]"
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
            {hasAccess ? (
              <LockKeyholeOpen size={20} color="#9CA5A3" className="ml-auto" />
            ) : (
              <LockKeyhole size={20} color="#9CA5A3" className="ml-auto" />
            )}
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
