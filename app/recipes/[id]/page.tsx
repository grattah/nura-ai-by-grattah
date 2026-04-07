import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Share, Bookmark, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FollowUpSection } from "@/components/follow-up-section";
import { PaywallGate } from "@/components/paywall/paywall-gate";
import { createClient } from "@/lib/supabase/server";
import { defaultFollowUpQuestions } from "@/lib/nura-dummy-data";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ [key: string]: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !recipe) {
    return notFound();
  }

  const ingredients =
    (recipe.ingredients as Array<{ emoji: string; label: string }>) || [];

  const howToMake =
    (recipe.how_to_make as Array<{ step: string; instruction: string }>) || [];

  return (
    <PaywallGate>
      <div className="min-h-screen bg-background">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
          >
            <Link href={`/recipes`}>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-11 h-11 text-foreground hover:opacity-70 transition-opacity"
              aria-label="Share recipe"
            >
              <Share className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-11 h-11 text-foreground hover:opacity-70 transition-opacity"
              aria-label="Bookmark recipe"
            >
              <Bookmark className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <main className="pb-6">
          {/* Hero image */}
          <div
            className="mx-4 rounded-3xl overflow-hidden bg-muted mb-5"
            style={{ aspectRatio: "16/9" }}
          >
            {recipe.image_url && (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Title + description */}
          <div className="px-4 mb-5">
            <h1 className="text-2xl font-bold text-foreground mb-1.5 leading-tight">
              {recipe.title}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              {recipe.short_description}
            </p>
          </div>

          {/* Accordion sections */}
          <div className="px-4 space-y-3">
            <Accordion type="multiple" defaultValue={[]} className="space-y-3">
              {/* 1 — Ingredients */}
              <AccordionItem
                value="ingredients"
                className="border-0 rounded-3xl overflow-hidden"
                style={{ backgroundColor: "#FAF0EE" }}
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <span className="text-base font-semibold text-foreground">
                    {recipe.recipe_section_title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                  <div className="space-y-2">
                    {ingredients.map((ing, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-2xl px-4 min-h-12"
                        style={{ backgroundColor: "#E8836A" }}
                      >
                        <span className="text-lg leading-none">
                          {ing.emoji}
                        </span>
                        <span className="text-sm font-medium text-foreground/85">
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
                className="border-0 rounded-3xl overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <span className="text-base font-semibold text-foreground">
                    How to make it
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <ol className="space-y-3">
                    {howToMake.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-base text-muted-foreground leading-relaxed"
                      >
                        <span className="text-foreground font-bold shrink-0 min-w-5">
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
                className="border-0 rounded-3xl overflow-hidden bg-card"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <span className="text-base font-semibold text-foreground">
                    Why it works:
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {recipe.why_it_works}
                  </p>
                </AccordionContent>
              </AccordionItem>

              {/* 4 — Inside Tip */}
              <AccordionItem
                value="tip"
                className="border-0 rounded-3xl overflow-hidden"
                style={{ backgroundColor: "#EEF4FB" }}
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline min-h-14">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <Info className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span
                      className="text-base font-semibold"
                      style={{ color: "#2563EB" }}
                    >
                      Inside Tip
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-0">
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {recipe.inside_tip}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Follow-up questions + RAG chat */}
            <div className="pt-2">
              <FollowUpSection
                contextId={recipe.id}
                contextType="recipe"
                title={recipe.title}
                description={recipe.short_description}
                staticQuestions={defaultFollowUpQuestions}
              />
            </div>

            {/* "Done" affordance */}
            <div className="pt-2 pb-2">
              <Separator className="bg-border mb-5" />
              <p className="text-sm text-muted-foreground text-center mb-3">
                Enjoyed this recipe?
              </p>
              <Button
                asChild
                variant="secondary"
                className="w-full rounded-full min-h-13 text-base font-semibold bg-card text-foreground border-0 shadow-none hover:opacity-80 transition-opacity"
              >
                <Link href={`/recipes`}>← Browse more recipes</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </PaywallGate>
  );
}
