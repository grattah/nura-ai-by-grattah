"use client";

import { useMemo } from "react";
import { HomeRecipeCard } from "@/components/home/home-recipe-card";
import { Recipe } from "@/lib/types";

interface TrendingRecipesProps {
  recipes: Recipe[];
  cardColors: readonly string[];
}

export function TrendingRecipes({ recipes, cardColors }: TrendingRecipesProps) {
  // useMemo means the shuffle runs once per mount, not on every render
  const shuffled = useMemo(
    () => [...recipes].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // empty deps — shuffle once when component mounts
  );

  return (
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
        {shuffled.map((recipe, index) => (
          <HomeRecipeCard
            key={`trending-${recipe.id}`}
            id={recipe.id}
            title={recipe.title}
            imageUrl={recipe.image_url ?? undefined}
            color={
              cardColors[(index + 2) % cardColors.length] as "sage" | "slate"
            }
            href={`/recipes/${recipe.id}`}
          />
        ))}
      </div>
    </section>
  );
}
