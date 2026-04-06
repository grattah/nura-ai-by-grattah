"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { dummyCategories } from "@/lib/dummy-data";
import type { User } from "@supabase/supabase-js";
import { ExploreMoreSection } from "./explore-more-section";
import { TodaysRecipeCard } from "./todays-recipe-card";
import { QuickTipCard } from "./quick-tip-card";
import { CategoryCard } from "./recipe-card";
import { exploreMoreItems } from "@/lib/nura-dummy-data";
import { dummyRecipes } from "@/lib/nura-dummy-data";
import { RecipeCard } from "../recipe-card";
import { InteractionGuard } from "@/components/paywall/interaction-guard";

export function HomeContent() {
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
              {dummyRecipes.slice(0, 4).map((recipe, index) => (
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
