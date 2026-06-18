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

interface RecipeSuggestion {
  title: string;
}

interface Recipe {
  created_at: string;
  display_order: number;
  short_description: string | null;
  follow_up_questions: string[] | null;
  how_to_make: any;
  id: string;
  title: string;
  image_url: string | null;
  ingredients: any;
  inside_tip: string;
  why_it_works: string;
  status: "approved" | "pending";
}

const page = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");
  const generateParam = searchParams.get("generate");
  const concernParam = searchParams.get("concern");
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = React.useState(
    query || generateParam || "",
  );
  const [allRecipes, setAllRecipes] = React.useState<Recipe[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = React.useState(true);
  const [suggestedRecipes, setSuggestedRecipes] = React.useState<Recipe[]>([]);
  const [pendingRecipe, setPendingRecipe] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState(false);
  const [aiSuggestions, setAiSuggestions] = React.useState<RecipeSuggestion[]>(
    [],
  );
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = React.useState(false);
  const [aiSuggestionsError, setAiSuggestionsError] = React.useState<
    string | null
  >(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showModalScreenLoader, setShowModalScreenLoader] =
    React.useState(false);
  const suggestionsCache = React.useRef<Map<string, RecipeSuggestion[]>>(
    new Map(),
  );

  const { recents, add: addRecent, clear: clearRecents } = useRecentSearches();
  const {
    setBalance,
    openBuyModal,
    refresh: refreshCredits,
  } = useCredits();

  const router = useRouter();

  React.useEffect(() => {
    const fetchAllRecipes = async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("status" as never, "approved" as never)
        .order("title", { ascending: true });

      if (error) {
        console.error("Failed to fetch recipes:", error);
      } else {
        setAllRecipes((data ?? []) as unknown as Recipe[]);
      }
      setIsLoadingRecipes(false);
    };

    fetchAllRecipes();
  }, []);

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
        .select("*")
        .eq("status" as never, "approved" as never)
        .or(orFilter)
        .limit(10);

      if (error) {
        console.error("Failed to fetch suggestions:", error);
        return;
      }

      // Shuffle and take 3 so the user sees variety each visit
      const shuffled = ((data ?? []) as unknown as Recipe[]).sort(
        () => Math.random() - 0.5,
      );
      setSuggestedRecipes(shuffled.slice(0, 3));
    };

    fetchSuggestions();
  }, [recents]);

  const filteredRecipes = React.useMemo(() => {
    const words = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);

    if (words.length === 0) return [];

    return allRecipes.filter((recipe) => {
      const haystack = recipe.title.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }, [searchTerm, allRecipes]);

  React.useEffect(() => {
    if (!searchTerm.trim() || filteredRecipes.length === 0) return;
    const timer = setTimeout(() => addRecent(searchTerm), 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, filteredRecipes]);

  const showingResults =
    !showSuggestions &&
    searchTerm.trim().length > 0 &&
    filteredRecipes.length > 0;
  const showingEmpty =
    !showSuggestions &&
    !isLoadingRecipes &&
    searchTerm.trim().length > 0 &&
    filteredRecipes.length === 0;
  const showingIdle = searchTerm.trim().length === 0 && !showSuggestions;
  const showingLoading =
    isLoadingRecipes && searchTerm.trim().length > 0 && !showSuggestions;

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
        if (res.status === 402) {
          const body = await res.json().catch(() => ({}));
          if (typeof body.balance === "number") setBalance(body.balance);
          setGenerating(false);
          setPendingRecipe(null);
          openBuyModal();
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
    [router, setBalance, openBuyModal, refreshCredits],
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
        <div className="px-6 max-xs:px-4 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <p className="max-xs:text-base text-2xl font-semibold text-[#111312]">
            Find a recipe
          </p>
        </div>
        <div className="mt-4 px-6 max-xs:px-4">
          <div className="relative">
            <button className="absolute top-1/2 -translate-y-1/2 left-3 max-xs:left-2">
              <Search
                color="#82A198"
                size={16}
                className="size-4 max-xs:size-3"
              />
            </button>
            <input
              name="search"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              type="text"
              className="w-full bg-white max-xs:py-2 py-3 pl-9 max-xs:pl-6.5 max-xs:pr-4 pr-3 max-xs:rounded-sm rounded-[12px] border border-[#E6ECEA] max-xs:text-xs text-base placeholder:text-[#9CA5A3] focus:ring-1 focus:ring-mint-green outline-none"
              placeholder="Search recipe..."
            />
            {searchTerm.length > 0 && (
              <button
                className="absolute top-1/2 -translate-y-1/2 right-3 max-xs:right-2"
                onClick={handleClearSearch}
              >
                <X color="#9CA5A3" size={16} className="size-4 max-xs:size-3" />
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

          {showingLoading && <RecipesSpinner />}

          {showingEmpty && (
            <div className="flex flex-col gap-5 mt-2 px-6">
              <div className="flex flex-col gap-2">
                <p className="font-medium max-xs:text-xs">Results</p>
                <p className="text-sm max-xs:text-[10px] text-subtle">
                  No recipe found for “{searchTerm.trim()}”.
                </p>
                {generateError && (
                  <p className="text-sm max-xs:text-[10px] text-red-500">
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
                    <p className="text-sm max-xs:text-xs text-subtle">
                      Recently searched
                    </p>
                    <button
                      className="text-mint-green underline font-semibold text-sm max-xs:text-xs hover:opacity-90 transition-opacity"
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
                          className="max-xs:size-3"
                          color="#9CA5A3"
                          strokeWidth={2}
                        />
                        <p className="font-medium max-xs:text-sm text-left">
                          {term}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {suggestedRecipes.length > 0 && (
                  <div className="mt-14 max-xs:mt-8 flex flex-col gap-5 px-6">
                    <p className="text-sm text-subtle max-xs:text-xs">
                      You may like
                    </p>
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
                            className="max-xs:size-3"
                          />
                          <p className="font-medium max-xs:text-sm">
                            {recipe.title}
                          </p>
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
          <>
            <div className="mt-8 flex flex-col gap-24 px-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium max-xs:text-sm">Results</p>
                  <p className="text-sm text-subtle max-xs:text-xs">
                    {filteredRecipes.length} recipes found
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {filteredRecipes.map((recipe) => (
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
                          className="max-xs:size-3"
                        />
                        <p className="font-medium max-xs:text-sm">
                          {recipe.title}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        color="#3F4644"
                        className="max-xs:size-2.75"
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
                  className="max-xs:size-3"
                />
                <span className="text-mint-green font-medium max-xs:text-sm text-base">
                  Get more suggestions
                </span>
              </button>
            </div>
          </>
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
                      <p className="text-sm max-xs:text-xs text-red-500">
                        Couldn&apos;t generate that recipe. Please try again.
                      </p>
                    )}
                    {aiSuggestions.map((recipe) => (
                      <button
                        key={recipe.title}
                        onClick={() =>
                          handleGenerate(
                            recipe.title,
                            searchTerm.trim() || undefined,
                          )
                        }
                        className="flex items-center gap-3 p-3 rounded-md hover:bg-[#E8E6DC] text-left transition-colors"
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
                <span className="text-mint-green font-medium">
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
          className={`px-6 max-xs:px-4 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A] ${generateParam && "flex gap-5 max-xs:gap-3 items-center"}`}
        >
          {generateParam && (
            <BackButton className="p-3 max-xs:p-2 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          )}
          <p className="text-2xl max-xs:text-base font-semibold text-[#111312]">
            Find a recipe
          </p>
        </div>

        <div className="mt-8 px-6 max-xs:px-4">
          <div className="relative">
            <div className="absolute top-1/2 -translate-y-1/2 left-3">
              <Search color="#82A198" size={16} className="max-xs:size-2.5" />
            </div>
            <input
              type="text"
              value={recipeName}
              readOnly
              className="w-full bg-white max-xs:py-2 max-xs:pr-2 py-3 pl-9 max-xs:pl-6 pr-3 max-xs:text-xs max-xs:rounded-sm rounded-lg border border-[#E6ECEA] text-sm text-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center gap-6 px-6 max-xs:px-4">
          <div className="relative size-24 max-xs:size-20 flex items-center justify-center">
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
            <div className="size-20 max-xs:size-15 rounded-full bg-linear-to-b from-[#F3EBD3] to-[#F8F5EE] flex items-center justify-center">
              <Sparkles
                size={28}
                color="#227B6F"
                strokeWidth={2}
                className="max-xs:size-5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl max-xs:text-base font-semibold text-[#333333]">
              Fetching your recipe...
            </h2>
            <p className="text-sm max-xs:text-xs text-subtle max-w-xs">
              Please hold on while we find the best answer for you
            </p>
          </div>
        </div>

        <div className="px-6 max-xs:px-4">
          <div className="mt-12 rounded-full bg-[#E8E6DC] max-xs:px-3.5 max-xs:py-2 px-5 py-3 flex items-center justify-center gap-2">
            <span className="text-lg max-xs:text-base">💡</span>
            <p className="text-sm max-xs:text-xs text-subtle font-medium">
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
      <div className="w-8 h-8 rounded-full border-2 border-mint-green border-t-transparent animate-spin" />
    </div>
  );
}

export default page;
