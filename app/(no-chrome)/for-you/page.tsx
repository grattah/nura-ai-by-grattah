"use client";

import React from "react";
import Link from "next/link";
import { HiOutlineInformationCircle } from "react-icons/hi";

import BackButton from "@/components/back-button";
import { getTopMatches } from "@/actions/for-you";
import { RecipeCardForYou } from "@/components/RecipeCardForYou";
import type { Tables } from "@/lib/database.types";

type RecipeWithMatch = Tables<"recipes"> & { matchScore: number };

const Page = () => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [activeType, setActiveType] = React.useState("all");
  const [availableTypes, setAvailableTypes] = React.useState<string[]>([]);
  const [initialRecipes, setInitialRecipes] = React.useState<RecipeWithMatch[]>(
    []
  );
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const { recipes } = await getTopMatches(12);
        if (recipes) {
          setInitialRecipes(recipes);
          setAvailableTypes([
            "all",
            ...new Set(recipes.map((r) => r.drink_type)),
          ]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    };
    fetchRecipes();
  }, []);

  const filteredRecipes =
    activeType === "all"
      ? initialRecipes
      : initialRecipes.filter((r) => r.drink_type === activeType);

  return (
    <div className="bg-background pb-10">
      <main className="px-6 pt-3">
        <div className="flex flex-col gap-6">
          {/* Header — always shown, doesn't depend on data */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
              <p className="font-semibold text-xl">Recommended for you</p>
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
            </div>
            {open && (
              <div className="absolute right-0 top-11 border border-[#74A7A0] bg-[#E6F4EB] px-3 py-2 rounded-lg z-20">
                <p className="font-medium text-subtle text-sm">
                  Your match score shows how well each recipe fits the health
                  goals and conditions in your profile. It’s calculated
                  separately for everything you’ve selected, and the recipe’s
                  strongest match is shown first.
                </p>
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 right-3 size-3 rotate-225 bg-[#E6F4EB] border-r border-b border-[#74A7A0] rounded-br-xs"
                />
              </div>
            )}
          </div>

          {!ready ? (
            <ForYouSkeleton />
          ) : (
            <>
              {availableTypes.length > 1 && (
                <div className="flex gap-2.25 overflow-x-auto w-full hide-scrollbar">
                  {availableTypes.map((type, i) => (
                    <button
                      key={i}
                      className={`py-3 px-4 rounded-[100px] text-base font-medium capitalize ${
                        activeType === type
                          ? "bg-mint-green text-white"
                          : "bg-white text-base-text"
                      }`}
                      onClick={() => setActiveType(type)}
                    >
                      {type.replace(/s$/, "")}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {filteredRecipes.map((recipe, i) => (
                  <div key={recipe.id} className="min-w-0">
                    <RecipeCardForYou
                      recipe={recipe}
                      score={recipe.matchScore}
                      priority={i < 2}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/health-profile"
            className="bg-mint-green text-white py-4 px-25 rounded-full font-medium text-sm"
          >
            Adjust my goals
          </Link>
        </div>
      </main>
    </div>
  );
};

const ForYouSkeleton = () => (
  <>
    {/* Pill row placeholders */}
    <div className="flex gap-2.25">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-11 w-20 rounded-[100px] bg-muted animate-pulse"
        />
      ))}
    </div>
    {/* Card grid placeholders */}
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="min-w-0 space-y-3">
          <div className="aspect-square w-full rounded-2xl bg-muted animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  </>
);

export default Page;
