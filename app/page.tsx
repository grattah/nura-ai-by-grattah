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
    .limit(20);

  if (error || !recipes) {
    return notFound();
  }

  // Shuffle recipes for trending section
  const shuffled = [...recipes].sort(() => Math.random() - 0.5);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 pt-4 pb-12 space-y-10">
        {/* Welcome Hero Section */}
        <section className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Nura
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            Discover wellness recipes designed to support your health journey.
            Explore nourishing meals, learn about functional ingredients, and
            make informed choices for a healthier you.
          </p>
        </section>

        <div className="space-y-4">
          {/* Hero — Today's Recipe */}
          {/* <TodaysRecipeCard /> */}

          {/* Quick Tip */}
          {/* <QuickTipCard
            title="Breast Health Assessment"
            description="Assess your risk factors in 2 minutes"
            href="/breast-risk-checker"
          />
          <QuickTipCard
            title="Prostate Health Assessment"
            description="Assess your risk factors in 2 minutes"
            href="/prostate-risk-checker"
            className="bg-[#5db1d0]"
          /> */}
        </div>

        {/* Wellness Recipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Wellness Recipes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Curated recipes to support your wellness goals
              </p>
            </div>
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recipes.slice(0, 12).map((recipe, index) => (
              <div key={recipe.id}>
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

        {/* Trending Recipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Trending Right Now
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Popular recipes loved by our community
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shuffled.slice(0, 8).map((recipe, index) => (
              <div key={`trending-${recipe.id}`}>
                <HomeRecipeCard
                  id={recipe.id}
                  title={recipe.title}
                  imageUrl={recipe.image_url ?? undefined}
                  color={CARD_COLORS[(index + 2) % CARD_COLORS.length]}
                  href={`/recipes/${recipe.id}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-card rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            About Our Recipes
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each recipe in our collection is thoughtfully selected to provide
            nutritional benefits and support various health goals. From
            anti-inflammatory ingredients to energy-boosting superfoods,
            discover meals that nourish your body and delight your palate.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-2xl font-bold text-foreground">100+</p>
              <p className="text-xs text-muted-foreground mt-1">
                Wellness Recipes
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">10+</p>
              <p className="text-xs text-muted-foreground mt-1">
                Health Categories
              </p>
            </div>
          </div>
        </section>

        {/* Explore More */}
        {/* <ExploreMoreSection items={exploreMoreItems} /> */}
      </main>
    </div>
  );
}
