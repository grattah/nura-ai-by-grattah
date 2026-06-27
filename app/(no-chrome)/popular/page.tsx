// app/popular/page.tsx (or wherever this lives)
import Link from "next/link";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { truncateText } from "@/lib/truncate-text";
import { fetchPopularRecipesOnePerCategory } from "@/lib/popular-recipes";
import BackButton from "@/components/back-button";

const page = async () => {
  const supabase = await createClient();
  const recipes = await fetchPopularRecipesOnePerCategory(supabase, 20);

  return (
    <div className="bg-background pb-10">
      <main className="px-6 pt-3 flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <p className="font-semibold text-xl">Popular Recipes</p>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3 space-y-3">
          {recipes.map((recipe) => {
            const firstTag = recipe.recipe_tags?.[0]?.tags?.name ?? null;
            return (
              <div key={recipe.id} className="flex flex-col gap-2">
                {recipe.image_url && (
                  <Link href={`/recipes/${recipe.id}`}>
                    <div className="overflow-hidden rounded-2xl">
                      <Image
                        src={recipe.image_url}
                        alt={recipe.title}
                        className="w-[clamp(136px,42.6vw,183px)] h-[clamp(124px,38.8vw,167px)] object-cover transition-transform duration-300 hover:scale-110"
                        width={183}
                        height={167}
                        sizes="(max-width: 430px) 42.6vw, 183px"
                      />
                    </div>
                  </Link>
                )}
                {firstTag && (
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="text-[#727E7A] text-xs font-medium font-josefin uppercase"
                  >
                    {firstTag}
                  </Link>
                )}
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="text-[#111312] font-medium text-base font-josefin line-clamp-1"
                >
                  {truncateText(recipe.title, 3)}
                </Link>
              </div>
            );
          })}
        </div>

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
