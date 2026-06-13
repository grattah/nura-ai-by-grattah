"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCategoryConfig } from "@/lib/category-config";
import { CategoryBanner } from "@/components/categories/category-banner";
import { RecipesEmptyState } from "@/components/categories/recipes-empty-state";
import { RecipeCard } from "@/components/recipe-card";
import { cn } from "@/lib/utils";
import type { CategoryRecipe } from "@/lib/types";

const PAGE_SIZE = 8;

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const config = getCategoryConfig(slug);

  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [recipes, setRecipes] = useState<CategoryRecipe[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Synchronous lock — the IntersectionObserver can re-fire `loadMore` before
  // the `isLoadingMore` state update lands, so a ref is needed to block overlap.
  const fetchingRef = useRef(false);

  const fetchRecipes = useCallback(
    async (pageNum: number, tab: string, isInitial: boolean) => {
      const start = pageNum * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      // Always filter by the current category slug.
      // The `id` tiebreaker makes the sort a total order — without it, OFFSET
      // pagination over the non-unique `display_order` is non-deterministic and
      // returns overlapping pages (recipes share display_order values), which
      // makes `hasMore` never settle and the infinite scroll loop forever.
      let query = supabase
        .from("recipes")
        .select(
          "id, title, image_url, display_order, recipe_tags!inner(tags!inner(slug))",
        )
        .eq("recipe_tags.tags.slug", slug)
        .order("display_order", { ascending: true })
        .order("id", { ascending: true })
        .range(start, end);

      // Secondary tab filter (skip for "all")
      if (tab !== "all") {
        query = query.eq("recipe_tags.tags.slug", tab);
      }

      const { data, error } = await query;
      if (error) {
        // Stop paginating on error rather than spinning the loader forever.
        console.error("Failed to load category recipes:", error);
        setHasMore(false);
        return [];
      }
      const rows = (data as unknown as CategoryRecipe[]) ?? [];

      if (isInitial) {
        setRecipes(rows);
      } else {
        // Dedupe by id so a stray duplicate can't produce duplicate React keys.
        setRecipes((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }

      setHasMore(rows.length === PAGE_SIZE);
      return rows;
    },
    [supabase, slug],
  );

  // Reset + fetch when slug or tab changes
  useEffect(() => {
    setIsLoading(true);
    setPage(0);
    setHasMore(true);
    fetchRecipes(0, activeTab, true).finally(() => setIsLoading(false));
  }, [slug, activeTab, fetchRecipes]);

  // Infinite scroll
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || isLoading || isLoadingMore || !hasMore) return;
    fetchingRef.current = true;
    setIsLoadingMore(true);
    try {
      const next = page + 1;
      const rows = await fetchRecipes(next, activeTab, false);
      if (rows.length > 0) setPage(next);
    } finally {
      setIsLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [isLoading, isLoadingMore, hasMore, page, activeTab, fetchRecipes]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const displayName = slug.replace(/-/g, " ");

  return (
    <div className="bg-background pb-24">
      {/* Header */}
      <div className="flex items-center px-4 pt-5 pb-4 gap-3">
        <button
          onClick={() => router.back()}
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text capitalize">
          Category
        </h1>
        <Link
          href={`/search-category?category=${slug}`}
          className="size-10 rounded-full bg-mint-green flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Search in category"
        >
          <Search className="size-5 text-white" />
        </Link>
      </div>

      <div className="space-y-6">
        {/* Category banner */}
        <CategoryBanner name={displayName} config={config} />

        {/* Recipe grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 animate-pulse px-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-3xl" />
            ))}
          </div>
        ) : recipes.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 px-4">
              {recipes.map((recipe, i) => (
                <RecipeCard key={recipe.id} recipe={recipe} priority={i < 4} />
              ))}
            </div>
            <div ref={sentinelRef} className="py-6 flex justify-center px-4">
              {isLoadingMore && (
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <span
                      key={d}
                      className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <RecipesEmptyState />
        )}
      </div>

      {/* Find a recipe CTA */}
      <div className="px-4 mt-4">
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

function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-5 py-3 rounded-full text-base font-medium transition-colors",
        active
          ? "text-white font-semibold"
          : "bg-grey-c100 text-base-text hover:opacity-80",
      )}
      style={active ? { backgroundColor: "var(--mint-green)" } : undefined}
    >
      {label}
    </button>
  );
}
