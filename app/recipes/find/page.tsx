"use client";

import React from "react";
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

const recipes = [
  { id: "b1fe27ea-a018-4238-be1a-8504a90efe2b", title: "Morning green resilience bowl" },
  { id: "4d1fe0fd-831a-44c1-9a55-b75e6c93babb", title: "Morning green resilience bowl" },
  { id: "b6f7912d-83ed-4f43-a102-0c97f2ece073", title: "Morning green resilience bowl" },
];

const page = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [step, setStep] = React.useState(1);
  const [pendingRecipe, setPendingRecipe] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const router = useRouter();

  const handleRecipeClick = (id: string, title: string) => {
    setPendingRecipe(title);
    setSearchTerm(title);
    startTransition(() => {
      router.push(`/recipes/${id}`);
    });
  };

  if( searchTerm.length > 0 && step === 1) {
    setStep(2);
  };

  // Show the full-screen loading state while navigation is in progress
  if (isPending && pendingRecipe) {
    return <RecipeLoadingScreen recipeName={pendingRecipe} />;
  }

  return (
    <div className="bg-background">
      <main className="px-4 pt-6">
        <p className="font-semibold text-xl">Find recipe</p>

        <div className="mt-8">
          <div className="relative">
            <button className="absolute top-3.75 left-3">
              <Search color="#82A198" size={16} />
            </button>
            <input
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              className="w-full bg-[#FFFFFF] py-3 pl-9 pr-3 rounded-lg border border-[#E6ECEA] text-sm placeholder:text-[#9CA5A3] focus:ring-2 focus:ring-ring outline-none"
              placeholder="Search recipe..."
            />
            {searchTerm.length > 0 && (
              <button
                className="absolute top-3.75 right-3"
                onClick={() => setSearchTerm("")}
              >
                <X color="#9CA5A3" size={16} />
              </button>
            )}
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="mt-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#57605E]">Recently searched</p>
                <p className="text-[#227B6F] underline font-semibold text-sm">
                  Clear
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Ginger-lemon shot</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Ginger-lemon shot</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Ginger-lemon shot</p>
                </div>
              </div>
            </div>

            <div className="mt-14 flex flex-col gap-5">
              <p className="text-sm text-[#57605E]">You may like</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Morning green resilience bowl</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Morning green resilience bowl</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Morning green resilience bowl</p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mt-8 flex flex-col gap-24">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Results</p>
                  <p className="text-sm text-[#57605E]">5 recipes found</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                </div>
              </div>
              <button
                className="border border-[#227B6F] w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={() => setStep(3)}
              >
                <Sparkles color="#227B6F" size={20} strokeWidth={2} />
                <span className="text-[#227B6F] font-medium">
                  Get more suggestions
                </span>
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mt-8 flex flex-col gap-24">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">More recipes for you</p>
                  <p className="text-sm text-[#57605E]">
                    Here are more recipes we found
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {recipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleRecipeClick(recipe.id, recipe.title)}
                      className="flex items-center gap-3 p-3 rounded-md hover:bg-[#E8E6DC] text-left transition-colors"
                    >
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium flex-1">{recipe.title}</p>
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="border border-[#227B6F] w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={() => setStep(2)}
              >
                <ArrowLeft color="#227B6F" size={20} strokeWidth={2} />
                <span className="text-[#227B6F] font-medium">
                  Back to results
                </span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

function RecipeLoadingScreen({ recipeName }: { recipeName: string }) {
  return (
    <div className="bg-background min-h-screen">
      <main className="px-4 pt-6">
        <p className="font-semibold text-xl">Find recipe</p>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute top-3.75 left-3">
              <Search color="#82A198" size={16} />
            </div>
            <input
              type="text"
              value={recipeName}
              readOnly
              className="w-full bg-[#FFFFFF] py-3 pl-9 pr-3 rounded-lg border border-[#E6ECEA] text-sm text-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center text-center gap-6">
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

        <div className="mt-12 rounded-full bg-[#E8E6DC] px-5 py-3 flex items-center justify-center gap-2">
          <span className="text-lg">💡</span>
          <p className="text-sm text-[#57605E] font-medium">
            Tip: This may take a few seconds
          </p>
        </div>
      </main>
    </div>
  );
}

export default page;
