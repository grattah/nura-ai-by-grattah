// app/popular/page.tsx (or wherever this lives)
import Link from "next/link";
import { ArrowLeft, MoveRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkedIds } from "@/actions/bookmark";
import { fetchPopularRecipesPage } from "@/lib/popular-recipes";
import { PopularRecipesList } from "@/components/recipe/PopularRecipeList";
import BackButton from "@/components/back-button";

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
      <main className="px-6 pt-3 flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <p className="font-semibold text-xl">Popular Recipes</p>
          <div />
        </div>

        <PopularRecipesList
          initialRecipes={initialRecipes}
          bookmarkedIds={Array.from(bookmarkedSet)}
          isAuthenticated={!!user}
        />

        <Link
          href="/find-recipe"
          className="w-full flex items-center justify-center text-white gap-3 py-4 bg-mint-green hover:opacity-90 transition-opacity rounded-full font-medium"
        >
          Find a recipe <MoveRight size={16} color="#FFFFFF" />
        </Link>
      </main>
    </div>
  );
};

export default page;
