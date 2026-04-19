import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodaysRecipeCard } from "@/components/home/todays-recipe-card";
import { QuickTipCard } from "@/components/home/quick-tip-card";
import { HomeRecipeCard } from "@/components/home/home-recipe-card";

// Alternating palette for recipe cards — matches Figma category card colors
const CARD_COLORS = ["sage", "slate", "sage", "slate"] as const;

export default async function HomePage() {
  const supabase = await createClient();

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("*")
    .limit(10);

  if (error || !recipes) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 pt-2 pb-10 space-y-8">
        <div className="space-y-4">
          {/* Hero — Today's Recipe */}
          <TodaysRecipeCard />

          {/* Quick Tip */}
          <QuickTipCard
            title="Breast Health Assessment"
            description="Assess your risk factors in 2 minutes"
            href="/breast-risk-checker"
          />
          <QuickTipCard
            title="Prostate Health Assessment"
            description="Assess your risk factors in 2 minutes"
            href="/prostate-risk-checker"
            className="bg-[#5db1d0]"
          />
        </div>

        {/* Wellness Recipes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">
              Wellness Recipes
            </h2>
            <Button
              variant="link"
              asChild
              className="p-0 h-auto text-sm text-foreground font-normal gap-0.5 hover:no-underline hover:opacity-70 transition-opacity"
            >
              <Link href="/recipes">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            {recipes.slice(0, 4).map((recipe, index) => (
              <div key={recipe.id} className="shrink-0 w-[42vw] max-w-44">
                <HomeRecipeCard
                  id={recipe.id}
                  title={recipe.title}
                  imageUrl={recipe.image_url ?? undefined}
                  color={CARD_COLORS[index % CARD_COLORS.length]}
                  href={`/recipes/${recipe.id}`}
                />
              </div>
            ))}
          </div> */}
          <div className="grid grid-cols-2 gap-2">
            {recipes.slice(0, 6).map((recipe, index) => (
              <div key={recipe.id} className="shrink-0">
                <HomeRecipeCard
                  id={recipe.id}
                  title={recipe.title}
                  imageUrl={recipe.image_url ?? undefined}
                  color={CARD_COLORS[index % CARD_COLORS.length]}
                  href={`/recipes/${recipe.id}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Explore More */}
        {/* <ExploreMoreSection items={exploreMoreItems} /> */}
      </main>
    </div>
  );
}
