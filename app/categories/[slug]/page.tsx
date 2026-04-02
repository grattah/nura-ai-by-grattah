"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/nura/filter-pills";
import {
  filterPills,
  dummyCategories,
  dummyRecipes,
} from "@/lib/nura-dummy-data";

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const category = dummyCategories.find((c) => c.slug === slug);

  // Active filter initialised to this category's group so the pill is
  // pre-selected when the user lands here — same UX, consistent contract.
  const [activeFilter, setActiveFilter] = useState(
    category?.filterGroup === "all" ? "all" : (category?.filterGroup ?? "all"),
  );

  // Filter recipes: when a pill is selected, show recipes whose category
  // belongs to that filter group. Falls back to current category only.
  const visibleRecipes = useMemo(() => {
    if (activeFilter === "all")
      return dummyRecipes.filter((r) => r.categorySlug === slug);
    const filteredSlugs = dummyCategories
      .filter((c) => c.filterGroup === activeFilter)
      .map((c) => c.slug);
    return dummyRecipes.filter((r) => filteredSlugs.includes(r.categorySlug));
  }, [activeFilter, slug]);

  const pageTitle = category?.title ?? "Recipes";

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
        >
          <Link href="/categories">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
      </div>

      {/* Filter pills — same in-place behaviour as /categories */}
      <div className="px-4 mb-5">
        <FilterPills
          pills={filterPills}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* Recipe grid */}
      <main className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {visibleRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/categories/${recipe.categorySlug}/${recipe.id}`}
            >
              <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card hover:opacity-90 active:scale-[0.97] transition-all duration-150">
                {/* Image */}
                <div className="w-full bg-muted" style={{ aspectRatio: "4/3" }}>
                  {recipe.imageUrl && (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Title + ingredient preview */}
                <CardContent className="px-4 py-3">
                  <p className="text-sm font-bold text-foreground mb-2 leading-snug">
                    {recipe.title}
                  </p>
                  <ul className="space-y-1">
                    {recipe.previewIngredients.slice(0, 3).map((ing, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-muted-foreground leading-snug"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {visibleRecipes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base text-muted-foreground">
              No recipes found for this filter.
            </p>
            <Button
              variant="ghost"
              onClick={() => setActiveFilter("all")}
              className="mt-3 text-sm min-h-11"
            >
              Show all
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
