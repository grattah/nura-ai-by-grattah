"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { HiOutlineInformationCircle } from "react-icons/hi";

import { createClient } from "@/lib/supabase/client";
import { hasActiveSubscription } from "@/lib/subscription";
import { getCategoryConfig } from "@/lib/category-config";
import { CategoryBanner } from "@/components/categories/category-banner";
import { RecipesEmptyState } from "@/components/categories/recipes-empty-state";
import { RecipeCard } from "@/components/recipe-card";
import { FilterPills, type FilterPill } from "@/components/filter-pills";
import { DRINK_TYPES } from "@/lib/drink-types";
import type { CategoryRecipe } from "@/lib/types";
import { RecipePaywallGate } from "@/components/recipe/RecipePaywallGate";

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

  const [open, setOpen] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // Shared rule — see lib/subscription.ts. The old inline check ignored
      // expires_at and paywalled anyone who had cancelled mid-period.
      setIsSubscribed(await hasActiveSubscription(supabase, user.id));
    };
    check();
  }, [supabase]);

  // Separate effect: once we know they're NOT subscribed, start the peek timer.
  useEffect(() => {
    if (recipesLoaded && isSubscribed === false) {
      const timer = setTimeout(() => setShowPaywall(true), 600); // peek delay
      return () => clearTimeout(timer);
    }
  }, [recipesLoaded, isSubscribed]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback(
    async (pageNum: number, signal: AbortSignal): Promise<CategoryRecipe[]> => {
      const start = pageNum * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      // Rank recipes within the category by their computed CategoryScore
      // (recipe_categories.score), highest first.
      let query = supabase
        .from("recipe_categories")
        .select(
          "score, recipes!inner(id, title, image_url, display_order, status, drink_type), categories!inner(slug)",
        )
        .eq("categories.slug", slug)
        .eq("qualified" as never, true as never)
        .eq("recipes.status" as never, "approved" as never);

      if (activeType !== "all") {
        query = query.eq("recipes.drink_type" as never, activeType as never);
      }

      if (searchQuery.trim()) {
        query = query.ilike(
          "recipes.title" as never,
          `%${searchQuery.trim()}%` as never,
        );
      }

      const { data, error } = await query
        .order("score", { ascending: false })
        .range(start, end)
        .abortSignal(signal);

      if (error) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        throw new Error(error.message);
      }
      return (
        (data as unknown as { score: number; recipes: CategoryRecipe }[]) ?? []
      ).map((row) => ({ ...row.recipes, score: row.score }));
    },
    [supabase, slug, activeType, searchQuery],
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
        if (epoch === epochRef.current) {
          setRecipesLoaded(true);
          setIsLoading(false);
        }
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
  const categoryLabel = config?.label ?? displayName;

  return (
    <div className="bg-white pb-24 min-h-svh flex flex-col">
      {/* Header */}
      <div className="px-6 bg-background">
        <div className="relative">
          <div className="flex items-center pt-5 pb-4 gap-3 shrink-0">
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
            <button
              className="rounded-full bg-[#E8E6DC] p-2"
              onClick={() => setOpen(!open)}
            >
              <HiOutlineInformationCircle
                color="#1B1D1D"
                className="size-4.5"
                strokeWidth={2}
              />
            </button>
            {/* <Link
          href={`/search-category?category=${slug}`}
          className="size-10 rounded-full bg-mint-green flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
          aria-label="Search in category"
        >
          <Search className="size-5 text-white" />
        </Link> */}
            {open && (
              <div className="absolute right-0 top-14.25 border border-[#74A7A0] bg-[#E6F4EB] px-3 py-2 rounded-lg z-20">
                <p className="font-medium text-subtle text-sm">
                  This Category Score shows how strongly this recipe supports
                  this category, based on its ingredients. It’s the same for
                  everyone.
                </p>
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 right-3 size-3 rotate-225 bg-[#E6F4EB] border-r border-b border-[#74A7A0] rounded-br-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 flex-1 mb-2">
        {/* Category banner */}
        <CategoryBanner name={categoryLabel} config={config} />

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

        <form action="" className="px-6 relative">
          <input
            type="text"
            className={`bg-[#F2F3F3] py-3 pr-3 pl-10 border w-full placeholder:text-muted placeholder:text-base outline-0 ${
              searchQuery.length > 0
                ? "rounded-full border-mint-green"
                : "rounded-xl border-grey-c100"
            }`}
            placeholder="Search Recipe..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Search
            size={16}
            color="#82A198"
            strokeWidth={1.67}
            className="absolute left-9 top-4.25"
          />
        </form>

        {searchQuery.length > 0 && (
          <p className="px-6 text-subtle text-sm leading-[14px]">
            Search Results
          </p>
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
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  score={recipe.score}
                  priority={i < 4}
                />
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

            {searchQuery && <div className="mt-2" />}

            {!searchQuery && atEnd && recipes.length >= PAGE_SIZE && (
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
      <div className="px-6 mt-auto">
        <Link
          href="/find-recipe"
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full border border-mint-green text-mint-green text-base font-semibold hover:opacity-80 transition-opacity"
        >
          Find a recipe <ArrowRight className="size-5 text-mint-green" />
        </Link>
      </div>
      {showPaywall && <RecipePaywallGate />}
    </div>
  );
}
