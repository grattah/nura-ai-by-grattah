import React from "react";
import Link from "next/link";

import BackButton from "@/components/back-button";
import { getTopMatches } from "@/actions/for-you";
import { RecipeCardForYou } from "@/components/RecipeCardForYou";

const page = async () => {
  const { recipes } = await getTopMatches(12);

  return (
    <div className="bg-background pb-10">
      <main className="px-6 pt-3">
        <div className="flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
            <p className="font-semibold text-xl">Recipes for you</p>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recipes.map((recipe, i) => {
              return (
                <div key={recipe.id} className="min-w-0">
                  <RecipeCardForYou
                    key={recipe.id}
                    recipe={recipe}
                    score={recipe.matchScore}
                    priority={i < 2}
                  />
                </div>
              );
            })}
          </div>
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

export default page;
