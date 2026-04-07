import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exploreMoreItems } from "@/lib/nura-dummy-data";
import { InteractionGuard } from "@/components/paywall/interaction-guard";
import { RecipeCard } from "@/components/recipe-card";
import { ExploreMoreSection } from "@/components/home/explore-more-section";
import { TodaysRecipeCard } from "@/components/home/todays-recipe-card";
import { QuickTipCard } from "@/components/home/quick-tip-card";

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
      <InteractionGuard>
        <main className="px-4 pb-8 space-y-6">
          <TodaysRecipeCard />

          <QuickTipCard
            title="Gain Body Mass"
            description="Consume a calorie surplus of 300–500 daily"
          />

          {/* Wellness Recipes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Wellness Recipes
              </h2>
              <Button
                variant="link"
                asChild
                className="p-0 h-auto text-sm text-foreground font-normal gap-1 hover:no-underline hover:opacity-80 transition-opacity"
              >
                <Link href="/recipes">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {recipes.slice(0, 4).map((recipe, index) => (
                <div key={recipe.id} className="shrink-0 w-40">
                  <RecipeCard key={recipe.id} recipe={recipe} />
                </div>
              ))}
            </div>
          </section>

          <ExploreMoreSection items={exploreMoreItems} />
        </main>
      </InteractionGuard>
    </div>
  );
}
