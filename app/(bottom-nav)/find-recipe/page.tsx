"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Clock,
  GlassWater,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useCredits } from "@/components/providers/credits-provider";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import ModalLoadingScreen from "@/components/recipe/ModalLoadingScreen";
import SearchX from "@/components/vectors/SearchX";
import { WELLNESS_SOURCES } from "@/lib/wellness-sources";
import BackButton from "@/components/back-button";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import TokensModal from "@/components/tokens/TokensModal";
import Arrow from "@/components/vectors/Arrow";

interface RecipeSuggestion {
  title: string;
}

// Search results / "you may like" only ever render id + title, so the queries
// select just those columns (no full-row, no full-catalog pull).
interface RecipeHit {
  id: string;
  title: string;
}

const page = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const generateParam = searchParams.get("generate");
  const concernParam = searchParams.get("concern");
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = React.useState(
    query || generateParam || ""
  );
  const [results, setResults] = React.useState<RecipeHit[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = React.useState<RecipeHit[]>(
    []
  );
  const [pendingRecipe, setPendingRecipe] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState(false);
  // Gated-response modals: paywall (guest / no subscription), token top-up (out of tokens).
  const [paywallOpen, setPaywallOpen] = React.useState(false);
  const [tokenModalOpen, setTokenModalOpen] = React.useState(false);
  const [aiSuggestions, setAiSuggestions] = React.useState<RecipeSuggestion[]>(
    []
  );
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = React.useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = React.useState<
    string | null
  >(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showModalScreenLoader, setShowModalScreenLoader] =
    React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const suggestionsCache = React.useRef<Map<string, RecipeSuggestion[]>>(
    new Map()
  );

  const { recents, add: addRecent, clear: clearRecents } = useRecentSearches();
  const { applyState, refresh: refreshCredits } = useCredits();

  const router = useRouter();

  // Debounced server-side search: query only the matching approved recipes
  // (id + title) instead of pulling the whole catalogue and filtering on every
  // keystroke. Each whitespace-split word must appear in the title (AND), which
  // preserves the previous client-side semantics.
  React.useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setResults([]);
      setSearchLoading(false);
      setHasSearched(false);
      return;
    }

    setSearchLoading(true);
    setHasSearched(false);
    const handle = setTimeout(async () => {
      const words = term.toLowerCase().split(/\s+/).filter(Boolean);
      let q = supabase
        .from("recipes")
        .select("id, title")
        .eq("status" as never, "approved" as never);
      for (const word of words) q = q.ilike("title", `%${word}%`);

      const { data, error } = await q
        .order("title", { ascending: true })
        .limit(20);

      if (error) {
        console.error("Failed to search recipes:", error);
      } else {
        setResults((data ?? []) as unknown as RecipeHit[]);
      }
      setSearchLoading(false);
      setHasSearched(true);
    }, 250);

    return () => clearTimeout(handle);
  }, [searchTerm, supabase]);

  React.useEffect(() => {
    if (recents.length === 0) {
      setSuggestedRecipes([]);
      return;
    }

    const fetchSuggestions = async () => {
      const orFilter = recents
        .flatMap((term) => [
          `title.ilike.%${term}%`,
          `short_description.ilike.%${term}%`,
        ])
        .join(",");

      const { data, error } = await supabase
        .from("recipes")
        .select("id, title")
        .eq("status" as never, "approved" as never)
        .or(orFilter)
        .limit(10);

      if (error) {
        console.error("Failed to fetch suggestions:", error);
        return;
      }

      // Shuffle and take 3 so the user sees variety each visit
      const shuffled = ((data ?? []) as unknown as RecipeHit[]).sort(
        () => Math.random() - 0.5
      );
      setSuggestedRecipes(shuffled.slice(0, 3));
    };

    fetchSuggestions();
  }, [recents]);

  React.useEffect(() => {
    if (!searchTerm.trim() || results.length === 0) return;
    const timer = setTimeout(() => addRecent(searchTerm), 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, results]);

  const showingResults =
    !showSuggestions && searchTerm.trim().length > 0 && results.length > 0;
  const showingEmpty =
    !showSuggestions &&
    hasSearched &&
    searchTerm.trim().length > 0 &&
    results.length === 0;
  const showingIdle = searchTerm.trim().length === 0 && !showSuggestions;
  const showingLoading =
    searchLoading &&
    searchTerm.trim().length > 0 &&
    !showSuggestions &&
    results.length === 0;

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    if (showSuggestions) {
      setShowSuggestions(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const handleGenerate = React.useCallback(
    async (name: string, concern?: string) => {
      const clean = name.trim();
      if (!clean) return;
      setPendingRecipe(clean);
      setGenerateError(false);
      setGenerating(true);
      try {
        const res = await fetch("/api/recipes/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: clean,
            concern,
            allowedDomains: WELLNESS_SOURCES,
          }),
        });
        // Out of tokens (subscriber): show the "Need more token?" modal on blur.
        if (res.status === 402) {
          const body = await res.json().catch(() => ({}));
          if (body.state) applyState(body.state);
          setGenerating(false);
          setPendingRecipe(null);
          setTokenModalOpen(true);
          return;
        }
        // Guest (401) or no active subscription (403): show the paywall/sign-up
        // modal rather than the generic red error.
        if (res.status === 401 || res.status === 403) {
          setGenerating(false);
          setPendingRecipe(null);
          setPaywallOpen(true);
          return;
        }
        if (!res.ok) throw new Error("generate failed");
        const data = await res.json();
        if (!data?.id) throw new Error("no id returned");
        refreshCredits();
        router.replace(`/recipes/${data.id}`);
      } catch (err) {
        console.error("[find-recipe] generate", err);
        setGenerating(false);
        setPendingRecipe(null);
        setGenerateError(true);
      }
    },
    [router, applyState, refreshCredits]
  );

  const autoTriggered = React.useRef(false);
  React.useEffect(() => {
    if (autoTriggered.current || !generateParam) return;
    autoTriggered.current = true;
    handleGenerate(generateParam, concernParam ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetSuggestions = async () => {
    setShowSuggestions(true);
    setAiSuggestionsError(null);

    const cacheKey = searchTerm.trim().toLowerCase();
    const cached = suggestionsCache.current.get(cacheKey);
    if (cached) {
      setAiSuggestions(cached);
      return;
    }

    setShowModalScreenLoader(true);
    setAiSuggestionsLoading(true);

    try {
      const res = await fetch("/api/recipes/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchTerm }),
      });

      if (!res.ok) throw new Error("Failed to fetch suggestions");

      const data = await res.json();
      const suggestions: RecipeSuggestion[] = data.suggestions ?? [];
      // Bound the in-memory cache for long sessions: evict the oldest entry
      // once it grows past ~50 keys (Map preserves insertion order).
      if (suggestionsCache.current.size >= 50) {
        const oldest = suggestionsCache.current.keys().next().value;
        if (oldest !== undefined) suggestionsCache.current.delete(oldest);
      }
      suggestionsCache.current.set(cacheKey, suggestions);
      setAiSuggestions(suggestions);
      setShowModalScreenLoader(false);
    } catch (error) {
      console.error("Failed to get suggestions:", error);
      setAiSuggestionsError("Couldn't load suggestions. Please try again.");
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  // Show the full-screen loading state while a recipe is being generated.
  if (generating && pendingRecipe) {
    return (
      <RecipeLoadingScreen
        recipeName={pendingRecipe}
        generateParam={generateParam}
      />
    );
  }

  return (
    <div className="bg-background">
      <main className="">
        <div
          className={`px-6 py-5 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A] ${
            showSuggestions && "flex gap-5 items-center"
          }`}
        >
          {showSuggestions && (
            <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          )}
          <div className="flex flex-col gap-3">
            <p
              className={`text-2xl font-semibold text-[#111312] ${
                showSuggestions && "max-[400px]:text-lg"
              }`}
            >
              {showSuggestions ? "Get more suggestions" : "Find a recipe"}
            </p>
            {showSuggestions ? (
              ""
            ) : (
              <p className="max-[400px]:text-sm text-subtle">
                Search for quality recipes made for your wellness
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 px-6 mb-4.5">
          <div className="relative">
            <button className="absolute top-1/2 -translate-y-1/2 left-3">
              <Search color="#82A198" size={16} className="size-4" />
            </button>
            <input
              name="search"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              type="text"
              className="w-full bg-white py-3 pl-9 pr-3 rounded-xl border border-[#E6ECEA] text-base placeholder:text-[#9CA5A3] focus:ring-1 focus:ring-mint-green outline-none"
              placeholder="Search recipe..."
            />
            {searchTerm.length > 0 && (
              <button
                className="absolute top-1/2 -translate-y-1/2 right-3"
                onClick={handleClearSearch}
              >
                <X color="#9CA5A3" size={16} className="size-4" />
              </button>
            )}
          </div>
        </div>

        <>
          {/* {searchState === "idle" && searchTerm.length > 0 && (
              <div className="mt-5 px-6">
                <button
                  className="w-full bg-mint-green text-[#FFFFFF] flex justify-center py-4 rounded-full hover:opacity-90 transition-opacity"
                  onClick={recipeSearch}
                >
                  Find recipe
                </button>
              </div>
            )} */}

          {searchTerm.length === 0 && (
            <div className="flex justify-center items-center">
              <div className="flex flex-col">
                <Arrow className="shrink-0" />
                <div className="text-mint-green w-30 text-sm ml-10 -mt-1.5 gveret-levin">
                  Start typing to discover recipes!
                </div>
              </div>
            </div>
          )}

          {showingLoading && <RecipesSpinner />}

          {showingEmpty && (
            <div className="flex flex-col gap-5 mt-2 px-6">
              <div className="flex flex-col gap-2">
                <p className="font-medium">Results</p>
                <p className="text-sm text-subtle">
                  No recipe found for “{searchTerm.trim()}”.
                </p>
                {generateError && (
                  <p className="text-sm text-red-500">
                    Couldn&apos;t generate that recipe. Please try again.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-6 w-full rounded-3xl bg-white py-10.5 px-6">
                <div className="flex flex-col gap-4 justify-center items-center">
                  <SearchX />
                  <p className="font-medium text-subtle text-center">
                    No recipe found. Please check your search again or check our
                    suggestions
                  </p>
                </div>
                <button
                  className="border border-mint-green py-4 flex items-center justify-center gap-3 rounded-full bg-white w-full"
                  onClick={handleGetSuggestions}
                >
                  <Sparkles color="#227B6F" size={20} strokeWidth={2} />
                  <span className="text-mint-green font-medium text-base">
                    Get suggestions
                  </span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-8">
            {showingIdle && searchTerm.length === 0 && recents.length > 0 && (
              <>
                <div className="flex flex-col gap-5 px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-subtle">Recently searched</p>
                    <button
                      className="text-mint-green underline font-semibold text-sm hover:opacity-90 transition-opacity"
                      onClick={clearRecents}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {recents.map((term) => (
                      <button
                        key={term}
                        className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3"
                        onClick={() => {
                          setSearchTerm(term);
                        }}
                      >
                        <Clock
                          size={20}
                          className=""
                          color="#9CA5A3"
                          strokeWidth={2}
                        />
                        <p className="font-medium text-left">{term}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {suggestedRecipes.length > 0 && (
                  <div className="mt-14 flex flex-col gap-5 px-6">
                    <p className="text-sm text-subtle">You may like</p>
                    <div className="flex flex-col gap-3">
                      {suggestedRecipes.map((recipe) => (
                        <Link
                          key={recipe.id}
                          href={`/recipes/${recipe.id}`}
                          className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3 text-left w-full"
                        >
                          <GlassWater
                            size={20}
                            color="#9CA5A3"
                            strokeWidth={2}
                            className=""
                          />
                          <p className="font-medium">{recipe.title}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>

        {showingResults && (
          <div className={searchLoading ? "opacity-60 transition-opacity" : ""}>
            <div className="mt-8 flex flex-col gap-24 px-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Results</p>
                  <p className="text-sm text-subtle">
                    {results.length} recipes found
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {results.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/recipes/${recipe.id}`}
                      className="flex items-center justify-between border-b border-[#E2E4E4] pb-3"
                    >
                      <div className="flex items-center gap-3">
                        <GlassWater
                          size={20}
                          color="#9CA5A3"
                          strokeWidth={2}
                          className="size-5"
                        />
                        <p className="font-medium text-base">{recipe.title}</p>
                      </div>
                      <ChevronRight
                        size={16}
                        color="#3F4644"
                        className="size-4"
                      />
                    </Link>
                  ))}
                </div>
              </div>
              <button
                className="border border-mint-green w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={handleGetSuggestions}
              >
                <Sparkles
                  color="#227B6F"
                  size={20}
                  strokeWidth={2}
                  className="size-5"
                />
                <span className="text-mint-green font-medium text-base">
                  Get more suggestions
                </span>
              </button>
            </div>
          </div>
        )}

        {showSuggestions && (
          <>
            <div className="mt-8 flex flex-col gap-24 px-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">More recipes for you</p>
                  <p className="text-sm text-subtle">
                    {aiSuggestionsLoading
                      ? "Finding recipes that match your search..."
                      : "Here are more recipes we found"}
                  </p>
                </div>
                {aiSuggestionsLoading ? (
                  <div className="flex justify-center py-8">
                    {/* <div className="w-6 h-6 rounded-full border-2 border-mint-green border-t-transparent animate-spin" /> */}
                  </div>
                ) : aiSuggestionsError ? (
                  <p className="text-sm text-red-500">{aiSuggestionsError}</p>
                ) : aiSuggestions.length === 0 ? (
                  <p className="text-sm text-subtle">
                    No suggestions found. Try a different search.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {generateError && (
                      <p className="text-sm text-red-500">
                        Couldn&apos;t generate that recipe. Please try again.
                      </p>
                    )}
                    {aiSuggestions.map((recipe) => (
                      <button
                        key={recipe.title}
                        onClick={() =>
                          handleGenerate(
                            recipe.title,
                            searchTerm.trim() || undefined
                          )
                        }
                        className="flex items-center gap-3 p-3 border-b hover:bg-[#E8E6DC] text-left transition-colors"
                      >
                        <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                        <p className="font-medium flex-1">{recipe.title}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="border border-mint-green w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={() => {
                  setShowSuggestions(false);
                }}
              >
                <ArrowLeft color="#227B6F" size={20} strokeWidth={2} />
                <span className="text-mint-green font-medium text-base">
                  Back to results
                </span>
              </button>
            </div>
          </>
        )}
      </main>
      {showModalScreenLoader && (
        <ModalLoadingScreen message="Fetching your recipe..." />
      )}

      {/* Guest / non-subscriber tried to generate → sign-up / subscribe modal. */}
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />

      {/* Subscriber out of tokens → "Need more token?" modal on a blurred page. */}
      {tokenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setTokenModalOpen(false)}
          />
          <div className="relative w-full max-w-sm">
            <TokensModal />
          </div>
        </div>
      )}
    </div>
  );
};

function RecipeLoadingScreen({
  recipeName,
  generateParam,
}: {
  recipeName: string;
  generateParam: string | null;
}) {
  return (
    <div className="bg-background min-h-screen">
      <main>
        <div
          className={`px-6 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A] ${
            generateParam && "flex gap-5 items-center"
          }`}
        >
          {generateParam && (
            <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          )}
          <p className="text-2xl font-semibold text-[#111312]">Find a recipe</p>
        </div>

        <div className="mt-8 px-6">
          <div className="relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-3">
              <Search color="#82A198" size={16} className="size-4" />
            </div>
            <input
              type="text"
              value={recipeName}
              readOnly
              className="w-full bg-white py-3 pl-9 pr-3 rounded-lg border border-[#E6ECEA] text-sm text-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center gap-6 px-6">
          <div className="relative size-24 flex items-center justify-center">
            <svg
              className="absolute inset-0 animate-spin"
              viewBox="0 0 100 100"
              style={{ animationDuration: "1.5s" }}
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#227B6F"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="100 283"
              />
            </svg>
            <div className="size-20 rounded-full bg-linear-to-b from-[#F3EBD3] to-[#F8F5EE] flex items-center justify-center">
              <Sparkles
                size={28}
                color="#227B6F"
                strokeWidth={2}
                className="size-7"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-[#333333]">
              Fetching your recipe...
            </h2>
            <p className="text-sm text-subtle max-w-xs">
              Please hold on while we find the best answer for you
            </p>
          </div>
        </div>

        <div className="px-6">
          <div className="mt-12 rounded-full bg-[#E8E6DC] px-5 py-3 flex items-center justify-center gap-2">
            <span className="text-lg">💡</span>
            <p className="text-sm text-subtle font-medium">
              Tip: This may take a few seconds
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function RecipesSpinner() {
  return (
    <div
      className="flex justify-center py-12"
      role="status"
      aria-label="Loading recipes"
    >
      <div className="size-8 rounded-full border-2 border-mint-green border-t-transparent animate-spin" />
    </div>
  );
}

export default page;
