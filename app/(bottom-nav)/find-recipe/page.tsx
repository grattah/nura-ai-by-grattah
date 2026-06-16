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
import { useRecentSearches } from "@/hooks/use-recent-searches";
import ModalLoadingScreen from "@/components/recipe/ModalLoadingScreen";
import SearchX from "@/components/vectors/SearchX";
import { WELLNESS_SOURCES } from "@/lib/wellness-sources";
import BackButton from "@/components/back-button";

interface RecipeSuggestion {
  id: string;
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
  const [isPending, startTransition] = React.useTransition();
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

  const handleRecipeClick = (id: string, title: string) => {
    setPendingRecipe(title);
    setSearchTerm(title);
    startTransition(() => {
      router.push(`/recipes/${id}`);
    });
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
        if (!res.ok) throw new Error("generate failed");
        const data = await res.json();
        if (!data?.id) throw new Error("no id returned");
        router.replace(`/recipes/${data.id}`);
      } catch (err) {
        console.error("[find-recipe] generate", err);
        setGenerating(false);
        setPendingRecipe(null);
        setGenerateError(true);
      }
    },
    [router],
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

  // Show the full-screen loading state while navigating to / generating a recipe
  if ((isPending || generating) && pendingRecipe) {
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
        <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <p className="text-2xl font-semibold text-[#111312]">Find a recipe</p>
        </div>
        <div className="mt-4 px-6">
          <div className="relative">
            <button className="absolute top-3.75 left-3">
              <Search color="#82A198" size={16} />
            </button>
            <input
              name="search"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              type="text"
              className="w-full bg-white py-3 pl-9 max-[350px]:pr-4 pr-3 rounded-[12px] border border-[#E6ECEA] text-base placeholder:text-[#9CA5A3] focus:ring-1 focus:ring-mint-green outline-none"
              placeholder="Search recipe..."
            />
            {searchTerm.length > 0 && (
              <button
                className="absolute top-3.75 right-3"
                onClick={handleClearSearch}
              >
                <X color="#9CA5A3" size={16} />
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
                <p className="font-medium">Results</p>
                <p className="text-sm text-[#57605E]">
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
                  className="border border-[#227B6F] py-4 flex items-center justify-center gap-3 rounded-full bg-white w-full"
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
                    <p className="text-sm text-[#57605E]">Recently searched</p>
                    <button
                      className="text-[#227B6F] underline font-semibold text-sm hover:opacity-90 transition-opacity"
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
                        <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                        <p className="font-medium text-left">{term}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {suggestedRecipes.length > 0 && (
                  <div className="mt-14 flex flex-col gap-5 px-6">
                    <p className="text-sm text-[#57605E]">You may like</p>
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
          <>
            <div className="mt-8 flex flex-col gap-24 px-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Results</p>
                  <p className="text-sm text-subtle">
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
                        <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                        <p className="font-medium">{recipe.title}</p>
                      </div>
                      <ChevronRight size={16} color="#3F4644" />
                    </Link>
                  ))}
                </div>
              </div>
              <button
                className="border border-[#227B6F] w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={handleGetSuggestions}
              >
                <Sparkles color="#227B6F" size={20} strokeWidth={2} />
                <span className="text-mint-green font-medium text-base">
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
                  <p className="text-sm text-[#57605E]">
                    No suggestions found. Try a different search.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {aiSuggestions.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() =>
                          handleRecipeClick(recipe.id, recipe.title)
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
          className={`px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A] ${generateParam && "flex gap-7 items-center"}`}
        >
          {generateParam && (
            <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          )}
          <p className="text-2xl font-semibold text-[#111312]">Find a recipe</p>
        </div>

        <div className="mt-8 px-8">
          <div className="relative">
            <div className="absolute top-3.75 left-3">
              <Search color="#82A198" size={16} />
            </div>
            <input
              type="text"
              value={recipeName}
              readOnly
              className="w-full bg-white py-3 pl-9 pr-3 rounded-lg border border-[#E6ECEA] text-sm text-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center gap-6 px-8">
          <div className="relative w-24 h-24 flex items-center justify-center">
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
            <div className="w-20 h-20 rounded-full bg-linear-to-b from-[#F3EBD3] to-[#F8F5EE] flex items-center justify-center">
              <Sparkles size={28} color="#227B6F" strokeWidth={2} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-[#333333]">
              Fetching your recipe...
            </h2>
            <p className="text-sm text-[#57605E] max-w-xs">
              Please hold on while we find the best answer for you
            </p>
          </div>
        </div>

        <div className="px-8">
          <div className="mt-12 rounded-full bg-[#E8E6DC] px-5 py-3 flex items-center justify-center gap-2">
            <span className="text-lg">💡</span>
            <p className="text-sm text-[#57605E] font-medium">
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
