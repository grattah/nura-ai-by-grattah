"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, SlidersHorizontal, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { FilterPills } from "@/components/filter-pills";

import { PaywallGate } from "@/components/paywall/paywall-gate";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Recipe, Tag } from "@/lib/types";
import { RecipeCard } from "@/components/recipe-card";

const PAGE_SIZE = 8;

export default function AllRecipesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // ─── Filter State (Source of Truth is the URL) ─────────────────────────────
  const committedTag = searchParams.get("tag") ?? "all";
  const committedSearch = searchParams.get("q") ?? "";

  // ─── Drawer State (Local draft until "Done" is clicked) ────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftTag, setDraftTag] = useState(committedTag);
  const [draftSearch, setDraftSearch] = useState(committedSearch);

  // ─── Data Fetching ────────────────────────────────────────────────────────

  // Fetch available tags once on mount
  useEffect(() => {
    async function getTags() {
      const { data } = await supabase
        .from("tags")
        .select("id, name, slug, display_order")
        .order("name");
      if (data) setTags(data);
    }
    getTags();
  }, [supabase]);

  // Main fetch function for recipes
  const fetchRecipes = useCallback(
    async (pageNum: number, isInitial: boolean = false) => {
      const start = pageNum * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      let query = supabase
        .from("recipes")
        .select(
          `
      *,
      recipe_tags!inner(tags!inner(slug))
    `,
        )
        .order("created_at", { ascending: false })
        .range(start, end);

      if (committedTag !== "all") {
        query = query.eq("recipe_tags.tags.slug", committedTag);
      }
      if (committedSearch) {
        query = query.ilike("title", `%${committedSearch}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase Error:", error.message);
        return [];
      }

      const newRecipes = (data as any) || [];

      if (isInitial) {
        setRecipes(newRecipes);
      } else {
        setRecipes((prev) => [...prev, ...newRecipes]);
      }

      // If we got fewer results than a full page, we've reached the end
      setHasMore(newRecipes.length === PAGE_SIZE);
      return newRecipes;
    },
    [supabase, committedTag, committedSearch],
  );

  useEffect(() => {
    async function resetAndFetch() {
      setIsLoading(true);
      setPage(0);
      setHasMore(true);
      await fetchRecipes(0, true);
      setIsLoading(false);
    }
    resetAndFetch();
  }, [committedTag, committedSearch, fetchRecipes]);

  // ─── Infinite Scroll Logic ────────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    // Prevent loading if already loading, or if we've reached the end
    if (isLoading || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    const results = await fetchRecipes(nextPage, false);

    if (results.length > 0) {
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }, [isLoading, isLoadingMore, hasMore, page, fetchRecipes]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore
        ) {
          loadMore();
        }
      },
      { rootMargin: "200px" }, // Increased margin to start loading before user hits bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoading, isLoadingMore]);

  // ─── UI Handlers ──────────────────────────────────────────────────────────
  const updateURL = (tag: string, search: string) => {
    const params = new URLSearchParams();
    if (tag !== "all") params.set("tag", tag);
    if (search.trim()) params.set("q", search.trim());
    router.replace(`/recipes?${params.toString()}`, { scroll: false });
  };

  const handlePillChange = (value: string) => updateURL(value, committedSearch);

  const handleDone = () => {
    updateURL(draftTag, draftSearch);
    setDrawerOpen(false);
  };

  const handleClearAll = () => {
    setDraftTag("all");
    setDraftSearch("");
  };

  const hasDraftChanges =
    (draftTag !== committedTag && draftTag !== "all") ||
    draftSearch !== committedSearch;

  const isFiltered = committedTag !== "all" || committedSearch !== "";

  return (
    <PaywallGate>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-5 pb-3 sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="p-0 h-11 w-11">
              <Link href="/">
                <ChevronLeft className="w-6 h-6" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold tracking-tight">All Recipes</h1>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="relative w-11 h-11 rounded-full bg-secondary/50"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {isFiltered && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500 border-2 border-background" />
            )}
          </Button>
        </header>

        {/* Top Pills Bar */}
        <div className="px-4 mb-4 overflow-hidden">
          <FilterPills
            pills={tags}
            active={committedTag}
            onChange={handlePillChange}
          />
        </div>
        {/* Active search query badge */}
        {committedSearch && (
          <div className="px-4 mb-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Search:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-card text-foreground">
              "{committedSearch}"
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("q");
                  router.replace(`/recipes?${params.toString()}`, {
                    scroll: false,
                  });
                }}
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </span>
          </div>
        )}

        {/* Recipe Grid */}
        <main className="px-4 pb-12">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-3xl" />
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              {/* Infinite Scroll Sentinel */}
              <div ref={sentinelRef} className="py-10 flex justify-center">
                {isLoadingMore && (
                  <div className="flex gap-1.5 items-center">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              hasFilters={isFiltered}
              onClear={() => updateURL("all", "")}
            />
          )}
        </main>

        {/* Filter Drawer */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="bg-card px-6 pb-10">
            <DrawerTitle className="sr-only">
              Search and filter recipes
            </DrawerTitle>

            <div className="space-y-6">
              <div className="flex items-center justify-between pt-4">
                <h2 className="text-lg font-bold text-foreground">
                  Search & Filter
                </h2>
                {hasDraftChanges && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm font-medium transition-opacity hover:opacity-70"
                    style={{ color: "#E8836A" }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <Separator className="bg-border p-0" />
              <section>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest block mb-4">
                  Search Recipes
                </label>
                <div className="flex items-center gap-3 bg-secondary/30 rounded-2xl px-4 py-4 border border-border/50 focus-within:border-orange-500 transition-colors">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    className="bg-transparent outline-none flex-1 text-base"
                    placeholder="Lemon, Chicken, Breakfast..."
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDone()}
                  />
                  {draftSearch && (
                    <button onClick={() => setDraftSearch("")}>
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </section>

              <section>
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest block mb-4">
                  Tags
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-[30vh] overflow-y-auto pr-2">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDraftTag(t.slug)}
                      className={cn(
                        "flex justify-between items-center px-5 py-4 rounded-2xl font-semibold transition-all",
                        draftTag === t.slug
                          ? "bg-foreground text-background scale-[0.98]"
                          : "bg-secondary/50 text-foreground active:scale-95",
                      )}
                    >
                      {t.name}
                      {draftTag === t.slug && (
                        <span className="w-2 h-2 rounded-full bg-background/60 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <Button
                onClick={handleDone}
                className="w-full rounded-full min-h-14 text-base font-bold bg-foreground text-background hover:bg-foreground/85 border-0 shadow-none active:scale-[0.98] transition-all sticky bottom-2 mt-auto"
              >
                Show Results
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PaywallGate>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-base text-muted-foreground mb-1">
        {hasFilters
          ? "No recipes match your search or filter."
          : "No recipes found."}
      </p>
      {hasFilters && (
        <>
          <p className="text-sm text-muted-foreground mb-5">
            Try a different search term or tag.
          </p>
          <Button
            variant="secondary"
            onClick={onClear}
            className="rounded-full px-6 min-h-11 text-sm font-semibold bg-card text-foreground border-0 shadow-none"
          >
            Clear filters
          </Button>
        </>
      )}
    </div>
  );
}
