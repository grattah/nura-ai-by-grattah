"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Sun, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TodaysRecipeCard } from "./todays-recipe-card";
import { QuickTipCard } from "./quick-tip-card";
import { CategoryCard } from "./recipe-card";
import {
  ExploreMoreSection,
  defaultExploreItems,
} from "./explore-more-section";
import { AppSidebar } from "./app-sidebar";
import { dummyCategories } from "@/lib/dummy-data";
import type { User } from "@supabase/supabase-js";
import ThemeToggleButton from "../theme-toggle-button";

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
      {/* Header */}
      <header className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            {isSignedIn ? (
              <>
                <h1 className="text-2xl font-semibold text-foreground">
                  <span className="italic font-normal">Hi,</span> {userName}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {"Let's answer some questions today."}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-foreground italic">
                  Explore Nura
                </h1>
                <p className="text-muted-foreground text-sm">
                  Health & Wellness Companion
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            {isSignedIn ? (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-foreground hover:opacity-80 transition-opacity"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-card rounded-full text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8 space-y-6">
        {/* Today's Recipe Card */}
        <TodaysRecipeCard onExplore={() => {}} />

        {/* Quick Tip */}
        <QuickTipCard
          title="Gain Body Mass"
          description="Consume a calorie surplus of 300-500 daily"
        />

        {/* Wellness Recipes Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Wellness Recipes
            </h2>
            <Link
              href="/categories"
              className="flex items-center gap-1 text-sm text-foreground hover:opacity-80 transition-opacity"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
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

        {/* Explore More Section */}
        <ExploreMoreSection items={defaultExploreItems} />
      </main>

      {/* Sidebar */}
      {isSignedIn && (
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={{ name: userName }}
        />
      )}
    </div>
  );
}
