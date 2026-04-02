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

interface HomeContentProps {
  user: User | null;
}

export function HomeContent({ user }: HomeContentProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSignedIn = !!user;

  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Franklin";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Main ───────────────────────────────────────────────────────────── */}
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
              <Link href="/categories">
                See all <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {dummyCategories.slice(0, 4).map((category, index) => (
              <div key={category.id} className="shrink-0 w-40">
                <CategoryCard
                  id={category.id}
                  title={category.title}
                  color={index % 2 === 0 ? "sage" : "gray"}
                  href={`/categories/${category.id}`}
                />
              </div>
            ))}
          </div>
        </section>

        <ExploreMoreSection items={exploreMoreItems} />
      </main>
    </div>
  );
}
