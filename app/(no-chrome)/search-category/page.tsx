"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCategoryConfig } from "@/lib/category-config";
import { CategoryBanner } from "@/components/categories/category-banner";
import { RecipesEmptyState } from "@/components/categories/recipes-empty-state";
import { SearchRecipeCard } from "@/components/search-recipe-card";
import type { CategoryRecipe, Tag } from "@/lib/types";

function SearchCategoryContent() {
  const router = useRouter();
  const params = useSearchParams();
  const categorySlug = params.get("category") ?? "";

  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CategoryRecipe[]>([]);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryName, setCategoryName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = getCategoryConfig(categorySlug);

  // Resolve category display name
  useEffect(() => {
    if (!categorySlug) return;
    supabase
      .from("tags")
      .select("name")
      .eq("slug", categorySlug)
      .single()
      .then(({ data }) => {
        if (data) setCategoryName((data as Tag).name);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }

      setIsLoading(true);
      setSearched(true);

      let queryBuilder = supabase
        .from("recipes")
        .select(
          categorySlug
            ? "id, title, image_url, display_order, recipe_categories!inner(score, categories!inner(slug))"
            : "id, title, image_url, display_order",
        )
        .eq("status" as never, "approved" as never)
        .ilike("title", `%${q.trim()}%`)
        .order("display_order", { ascending: true })
        .limit(20);

      if (categorySlug) {
        queryBuilder = queryBuilder
          .eq("recipe_categories.categories.slug", categorySlug)
          .eq("recipe_categories.qualified" as never, true as never);
      }

      const { data } = await queryBuilder;
      const mapped = (
        (data as unknown as Array<{
          id: string;
          title: string;
          image_url: string | null;
          display_order: number;
          recipe_categories?: { score: number }[];
        }>) ?? []
      ).map((r) => ({
        id: r.id,
        title: r.title,
        image_url: r.image_url,
        display_order: r.display_order,
        score: r.recipe_categories?.[0]?.score,
      }));
      setResults(mapped);
      setIsLoading(false);
    },
    [supabase, categorySlug],
  );

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const backHref = categorySlug ? `/categories/${categorySlug}` : "/categories";

  return (
    <div className="bg-background min-h-dvh pb-24">
      {/* Header — search bar IS the header */}
      <div className="flex items-center gap-8.75 px-6 pt-5 pb-4">
        <button
          onClick={() => router.push(backHref)}
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-grey-c950" />
        </button>

        <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3 h-11 border border-mint-green">
          <Search
            className="size-4 text-muted-foreground shrink-0"
            strokeWidth={1.75}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search recipes…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => handleChange("")} aria-label="Clear">
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {/* Category banner (if context present) */}
        {categorySlug && (
          <CategoryBanner name={categoryName || categorySlug} config={config} />
        )}

        {/* Results */}
        {searched && (
          <>
            <p className="text-sm text-subtle">Search results</p>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-3xl" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {results.map((recipe, i) => (
                  <SearchRecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    priority={i < 4}
                    score={recipe.score}
                  />
                ))}
              </div>
            ) : (
              <RecipesEmptyState query={query} />
            )}
          </>
        )}
      </div>

      {/* Find a recipe CTA — always visible */}
      <div className="px-6 mt-6">
        <Link
          href="/find-recipe"
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full border border-mint-green text-mint-green text-base font-semibold hover:opacity-80 transition-opacity"
        >
          Find a recipe <ArrowRight className="size-5 text-mint-green" />
        </Link>
      </div>
    </div>
  );
}

export default function SearchCategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SearchCategoryContent />
    </Suspense>
  );
}
