import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MoveRight, Heart, Bookmark } from "lucide-react";

import { BookmarkButton } from "@/components/bookmark-button";
import { createClient } from "@/lib/supabase/client";
import { isBookmarked } from "@/actions/bookmark";

const page = async () => {
  const supabase = createClient();

  const [
    { data: recipes, error },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("recipes")
      .select("*")
      .gt("likes", 100)
      .order("title", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  if (error) {
    throw new Error("Failed to load popular recipes");
  }

  // Check bookmark status for all recipes in parallel
  const bookmarkStatuses = await Promise.all(
    (recipes ?? []).map((recipe) => isBookmarked(recipe.id))
  );

  // Pair each recipe with its bookmark status
  const recipesWithBookmarks = (recipes ?? []).map((recipe, i) => ({
    ...recipe,
    bookmarked: bookmarkStatuses[i],
  }));

  return (
    <div className="bg-background pb-10">
      <main className="px-4 pt-3 flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-full bg-[#E8E6DC] p-3">
            <ArrowLeft size={20} color="#1B1D1D" strokeWidth={1.5} />
          </Link>
          <p className="font-semibold text-xl">Popular Recipes</p>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3 space-y-3">
          {recipesWithBookmarks?.map((recipe) => (
            <div key={recipe.id} className="relative flex flex-col gap-2">
              <div className="absolute flex justify-between px-2 top-3 left-0 right-0 z-10">
                <button className="bg-[#000000] opacity-75 flex items-center gap-1 rounded-full p-1.5 px-3">
                  <Heart size={12} color="#FFFFFF" strokeWidth={2} />
                  <span className="text-xs text-[#FFFFFF] opacity-100">
                    {recipe.likes}
                  </span>
                </button>
                <BookmarkButton
                  recipeId={recipe.id}
                  initialBookmarked={recipe.bookmarked}
                  isAuthenticated={!!user}
                  text=""
                  addText=""
                  popularStyle="yes"
                />
              </div>
              {recipe.image_url && (
                <Link href={`/recipes/${recipe.id}`}>
                  <div className="overflow-hidden rounded-2xl">
                    <Image
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="w-full h-30 object-cover transition-transform duration-300 hover:scale-110"
                      width={100}
                      height={200}
                    />
                  </div>
                </Link>
              )}

              <Link
                href={`/recipes/${recipe.id}`}
                className="text-[#727E7A] text-xs font-redHatDisplay font-medium"
              >
                INDIGESTION
              </Link>
              <Link
                href={`/recipes/${recipe.id}`}
                className="text-[#111312] font-medium font-josefin"
              >
                {recipe.title}
              </Link>
            </div>
          ))}
        </div>

        <Link
          href="/recipes/find"
          className="w-full flex items-center justify-center text-[#FFFFFF] gap-3 py-4 bg-[#227B6F] hover:opacity-90 transition-opacity rounded-full font-medium"
        >
          Find a recipe <MoveRight size={16} color="#FFFFFF" />
        </Link>
      </main>
    </div>
  );
};

export default page;
