"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, SlidersHorizontal, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { FilterPills } from "@/components/nura/filter-pills";
import { filterPills, dummyRecipes, type Recipe } from "@/lib/nura-dummy-data";
import { cn } from "@/lib/utils";
import { RecipeCard } from "@/components/nura";
import { PaywallGate } from "@/components/paywall/paywall-gate";

// ─── Config ───────────────────────────────────────────────────────────────────
// Recipes per infinite-scroll page. When wiring Supabase, replace the
// client-side slice with:
//   supabase.from("recipes")
//     .select("id, title, image_url, preview_ingredients, category_slug, tags")
//     .contains("tags", tag === "all" ? [] : [tag])
//     .ilike("title", `%${search}%`)
//     .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
const PAGE_SIZE = 6;

export default function AllRecipesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Committed filter state — lives in the URL ─────────────────────────────
  const committedTag = searchParams.get("tag") ?? "all";
  const committedSearch = searchParams.get("q") ?? "";

  // ── Drawer state — local draft until the user hits Done ───────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftTag, setDraftTag] = useState(committedTag);
  const [draftSearch, setDraftSearch] = useState(committedSearch);

  // Keep draft in sync when URL changes externally (e.g. back button)
  useEffect(() => {
    setDraftTag(committedTag);
    setDraftSearch(committedSearch);
  }, [committedTag, committedSearch]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset page when committed filters change
  useEffect(() => {
    setPage(1);
  }, [committedTag, committedSearch]);

  // ── Filter + search against committed values ──────────────────────────────
  const filteredRecipes = useMemo(() => {
    let results = dummyRecipes;

    if (committedTag !== "all") {
      results = results.filter((r) => r.tags?.includes(committedTag));
    }

    if (committedSearch.trim()) {
      const q = committedSearch.toLowerCase();
      results = results.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.previewIngredients.some((i) => i.toLowerCase().includes(q)),
      );
    }

    return results;
  }, [committedTag, committedSearch]);

  const visibleRecipes = filteredRecipes.slice(0, page * PAGE_SIZE);
  const hasMore = visibleRecipes.length < filteredRecipes.length;

  // ── IntersectionObserver ──────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    // Remove setTimeout when using real async Supabase queries
    setTimeout(() => {
      setPage((p) => p + 1);
      setIsLoadingMore(false);
    }, 500);
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Pill change (outside drawer — commits immediately) ────────────────────
  const handlePillChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    value === "all" ? params.delete("tag") : params.set("tag", value);
    router.replace(`/recipes?${params.toString()}`, { scroll: false });
  };

  // ── Done — commits draft state to URL and closes drawer ───────────────────
  const handleDone = () => {
    const params = new URLSearchParams(searchParams.toString());

    draftTag === "all" ? params.delete("tag") : params.set("tag", draftTag);
    draftSearch.trim()
      ? params.set("q", draftSearch.trim())
      : params.delete("q");

    router.replace(`/recipes?${params.toString()}`, { scroll: false });
    setDrawerOpen(false);
  };

  // ── Clear all ─────────────────────────────────────────────────────────────
  const handleClearAll = () => {
    setDraftTag("all");
    setDraftSearch("");
  };

  const hasDraftChanges =
    draftTag !== committedTag || draftSearch !== committedSearch;

  const activeLabel =
    filterPills.find((p) => p.value === committedTag)?.label ?? "All";

  // Active filter indicator shown in the header trigger button
  const isFiltered = committedTag !== "all" || committedSearch !== "";

  return (
    <PaywallGate>
      <div className="min-h-screen bg-background">
        {/* ── Sub-header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
            >
              <Link href="/">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-foreground">All Recipes</h1>
          </div>

          {/* Drawer trigger — dot indicator when filters are active */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="relative w-11 h-11 rounded-full bg-card text-foreground hover:opacity-80 transition-opacity"
            aria-label="Open search and filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {isFiltered && (
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full"
                style={{ backgroundColor: "#E8836A" }}
              />
            )}
          </Button>
        </div>

        {/* ── Filter pills (committed tag) ──────────────────────────────────── */}
        <div className="px-4 mb-4">
          <FilterPills
            pills={filterPills}
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

        {/* ── Recipe grid ──────────────────────────────────────────────────────── */}
        <main className="px-4 pb-10">
          {visibleRecipes.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {visibleRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>

              {/* Infinite scroll sentinel + loader */}
              <div ref={sentinelRef} className="py-6 flex justify-center">
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
              onClear={() => {
                router.replace("/recipes", { scroll: false });
              }}
            />
          )}
        </main>

        {/* ── Filter & Search Drawer ────────────────────────────────────────────── */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent
            className="border-0 rounded-t-3xl bg-card focus:outline-none"
            style={{ maxHeight: "85svh" }}
          >
            {/* Hidden a11y title */}
            <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-border" />
            <DrawerTitle className="sr-only">
              Search and filter recipes
            </DrawerTitle>

            <div className="flex flex-col overflow-y-auto px-5 pb-8">
              {/* Drawer header */}
              <div className="flex items-center justify-between py-4">
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

              <Separator className="bg-border mb-5" />

              {/* Search input */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Search Recipes
                </p>
                <div className="flex items-center gap-2 bg-background rounded-2xl px-4 py-3.5 border border-border">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDone()}
                    placeholder="e.g. spinach, detox, lemon..."
                    autoComplete="off"
                    className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  {draftSearch && (
                    <button
                      onClick={() => setDraftSearch("")}
                      aria-label="Clear search"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <Separator className="bg-border mb-5" />

              {/* Tag list */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Filter by Tag
                </p>
                <div className="flex flex-col gap-2">
                  {filterPills.map((pill) => {
                    const isActive = pill.value === draftTag;
                    return (
                      <button
                        key={pill.value}
                        onClick={() => setDraftTag(pill.value)}
                        className={cn(
                          "flex items-center justify-between px-4 min-h-12 rounded-2xl text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
                          isActive
                            ? "bg-foreground text-background"
                            : "bg-background text-foreground hover:opacity-80",
                        )}
                      >
                        <span>{pill.label}</span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-background/60 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Done button */}
              <Button
                onClick={handleDone}
                className="w-full rounded-full min-h-14 text-base font-bold bg-foreground text-background hover:bg-foreground/85 border-0 shadow-none active:scale-[0.98] transition-all sticky bottom-2 mt-auto"
              >
                Done
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </PaywallGate>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

// ─── EmptyState ───────────────────────────────────────────────────────────────

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
