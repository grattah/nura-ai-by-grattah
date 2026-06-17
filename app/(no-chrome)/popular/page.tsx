// app/popular/page.tsx (or wherever this lives)
import Link from "next/link";
import { ArrowLeft, MoveRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkedIds } from "@/actions/bookmark";
import { fetchPopularRecipesPage } from "@/lib/popular-recipes";
import { PopularRecipesList } from "@/components/recipe/PopularRecipeList";

const page = async () => {
  const supabase = await createClient();

  const [
    initialRecipes,
    {
      data: { user },
    },
  ] = await Promise.all([
    fetchPopularRecipesPage(supabase, 0),
    supabase.auth.getUser(),
  ]);

  const bookmarkedSet = await getBookmarkedIds(initialRecipes.map((r) => r.id));

  return (
    <div className="bg-background pb-10">
      <main className="px-6 max-xs:px-4 pt-3 flex flex-col gap-10 max-xs:gap-7">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-full bg-[#E8E6DC] p-3 max-xs:p-2">
            <ArrowLeft
              size={20}
              color="#1B1D1D"
              strokeWidth={1.5}
              className="max-xs:size-3"
            />
          </Link>
          <p className="font-semibold text-xl max-xs:text-base">
            Popular Recipes
          </p>
          <div />
        </div>

        <PopularRecipesList
          initialRecipes={initialRecipes}
          bookmarkedIds={Array.from(bookmarkedSet)}
          isAuthenticated={!!user}
        />

        <Link
          href="/find-recipe"
          className="w-full flex items-center max-xs:text-sm justify-center text-white gap-3 py-4 max-xs:py-3 bg-mint-green hover:opacity-90 transition-opacity rounded-full font-medium"
        >
          Find a recipe <MoveRight size={16} color="#FFFFFF" />
        </Link>
      </main>
    </div>
  );
};

export default page;
