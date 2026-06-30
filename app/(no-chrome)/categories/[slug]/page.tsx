"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCategoryConfig } from "@/lib/category-config";
import { CategoryBanner } from "@/components/categories/category-banner";
import { RecipesEmptyState } from "@/components/categories/recipes-empty-state";
import { RecipeCard } from "@/components/recipe-card";
import { FilterPills, type FilterPill } from "@/components/filter-pills";
import { DRINK_TYPES } from "@/lib/drink-types";
import type { CategoryRecipe } from "@/lib/types";

const PAGE_SIZE = 8;
const FETCH_TIMEOUT_MS = 15000;

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const config = getCategoryConfig(slug);

  const supabase = useMemo(() => createClient(), []);

  const [activeType, setActiveType] = useState("all");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const [recipes, setRecipes] = useState<CategoryRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const loadMoreErrorRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const epochRef = useRef(0);

  const fetchPage = useCallback(
    async (pageNum: number, signal: AbortSignal): Promise<CategoryRecipe[]> => {
      const start = pageNum * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let query = supabase
        .from("recipes")
        .select(
          "id, title, image_url, display_order, recipe_tags!inner(tags!inner(slug))",
        )
        .eq("recipe_tags.tags.slug", slug)
        .eq("status" as never, "approved" as never);

      if (activeType !== "all") {
        query = query.eq("drink_type" as never, activeType as never);
      }

      const { data, error } = await query
        .order("display_order", { ascending: true })
        .order("id", { ascending: true })
        .range(start, end)
        .abortSignal(signal);

      if (error) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        throw new Error(error.message);
      }
      return (data as unknown as CategoryRecipe[]) ?? [];
    },
    [supabase, slug, activeType],
  );

  const loadMore = useCallback(async () => {
    if (
      fetchingRef.current ||
      !hasMoreRef.current ||
      loadMoreErrorRef.current
    ) {
      return;
    }
    fetchingRef.current = true;
    setIsLoadingMore(true);

    const myEpoch = epochRef.current;
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const next = pageRef.current + 1;
      const rows = await fetchPage(next, controller.signal);
      if (myEpoch !== epochRef.current) return; // category changed mid-flight

      if (rows.length > 0) {
        pageRef.current = next;
        setRecipes((prev) => {
          const seen = new Set(prev.map((r) => r.id));
          return [...prev, ...rows.filter((r) => !seen.has(r.id))];
        });
      }
      hasMoreRef.current = rows.length === PAGE_SIZE;
      if (!hasMoreRef.current) {
        setAtEnd(true);
        observerRef.current?.disconnect();
      }
    } catch (e) {
      if (myEpoch === epochRef.current && (timedOut || !isAbortError(e))) {
        console.error("Failed to load more category recipes:", e);
        loadMoreErrorRef.current = true;
        setLoadMoreError(true);
      }
    } finally {
      clearTimeout(timer);
      if (myEpoch === epochRef.current) {
        fetchingRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [fetchPage]);

  const retryLoadMore = useCallback(() => {
    loadMoreErrorRef.current = false;
    setLoadMoreError(false);
    loadMore();
  }, [loadMore]);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) loadMore();
        },
        { rootMargin: "200px" },
      );
      observerRef.current.observe(node);
    },
    [loadMore],
  );

  useEffect(() => {
    const epoch = ++epochRef.current;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    loadMoreControllerRef.current?.abort();

    pageRef.current = 0;
    hasMoreRef.current = true;
    fetchingRef.current = false;
    loadMoreErrorRef.current = false;
    setIsLoading(true);
    setError(false);
    setLoadMoreError(false);
    setAtEnd(false);

    fetchPage(0, controller.signal)
      .then((rows) => {
        if (epoch !== epochRef.current) return;
        setRecipes(rows);
        hasMoreRef.current = rows.length === PAGE_SIZE;
        if (!hasMoreRef.current) setAtEnd(true);
      })
      .catch((e) => {
        if (epoch === epochRef.current && (timedOut || !isAbortError(e))) {
          console.error("Failed to load category recipes:", e);
          setError(true);
        }
      })
      .finally(() => {
        clearTimeout(timer);
        if (epoch === epochRef.current) setIsLoading(false);
      });

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, fetchPage, reloadKey]);

  useEffect(() => {
    setActiveType("all");
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc(
        "category_drink_types" as never,
        {
          p_slug: slug,
        } as never,
      );
      if (cancelled) return;
      const present = new Set(
        ((data as { drink_type: string }[] | null) ?? []).map(
          (r) => r.drink_type,
        ),
      );
      setAvailableTypes(
        DRINK_TYPES.filter((d) => present.has(d.slug)).map((d) => d.slug),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  const pills: FilterPill[] = [
    { slug: "all", name: "All" },
    ...DRINK_TYPES.filter((d) => availableTypes.includes(d.slug)).map((d) => ({
      slug: d.slug,
      name: d.name,
    })),
  ];

  const displayName = slug?.replace(/-/g, " ") ?? "";

  return (
    <div className="bg-white pb-24 min-h-svh">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-4 gap-3 bg-background">
        <button
          onClick={() => router.back()}
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text capitalize">
          {displayName}
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

        {/* Drink-type sub-sub-category filter (shown once present types load) */}
        {pills.length > 1 && (
          <div className="px-6">
            <FilterPills
              pills={pills}
              active={activeType}
              activeLabel={activeType === "all" ? "All" : undefined}
              onChange={setActiveType}
            />
          </div>
        )}

        {/* Recipe grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 animate-pulse px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-3xl" />
            ))}
          </div>
        ) : error && recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load recipes. Please try again.
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full px-6 py-3 text-sm font-semibold bg-mint-green text-white hover:opacity-90 transition-opacity active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : recipes.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 px-6">
              {recipes.map((recipe, i) => (
                <RecipeCard key={recipe.id} recipe={recipe} priority={i < 4} />
              ))}
            </div>

            {!atEnd && (
              <div ref={sentinelRef} className="py-6 flex justify-center px-6">
                {isLoadingMore ? (
                  <div
                    className="flex gap-1.5"
                    role="status"
                    aria-label="Loading more recipes"
                  >
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                ) : loadMoreError ? (
                  <button
                    onClick={retryLoadMore}
                    className="text-sm font-semibold text-mint-green underline underline-offset-4 hover:opacity-75 transition-opacity active:scale-95"
                  >
                    Couldn&apos;t load more — retry
                  </button>
                ) : null}
              </div>
            )}

            {atEnd && recipes.length >= PAGE_SIZE && (
              <p className="text-center text-sm text-muted-foreground pb-2">
                You&apos;ve reached the end.
              </p>
            )}
          </>
        ) : (
          <RecipesEmptyState />
        )}
      </div>

      {/* Find a recipe CTA */}
      <div className="px-6 mt-4">
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
