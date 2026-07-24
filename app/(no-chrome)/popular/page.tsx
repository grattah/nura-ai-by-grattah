import Link from "next/link";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { truncateText } from "@/lib/truncate-text";
import { fetchPopularRecipesOnePerCategory } from "@/lib/popular-recipes";
import BackButton from "@/components/back-button";
import { getCategoryConfig } from "@/lib/category-config";

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
            const topCat = [...(recipe.recipe_categories ?? [])]
              .filter(
                (rc: { categories: unknown; qualified?: boolean }) =>
                  rc.qualified && rc.categories,
              )
              .sort(
                (a: { score: number }, b: { score: number }) =>
                  b.score - a.score,
              )[0]?.categories;
            const firstTag = topCat?.name ?? null;
            const catSlug = topCat?.slug ?? null;
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
                <div className="space-y-1">
                  {firstTag && (
                    <div
                      style={{
                        backgroundColor: getCategoryConfig(catSlug!).bgColor,
                        color: getCategoryConfig(catSlug!).textColor,
                      }}
                      className="text-xs w-fit text-grey-c500 uppercase tracking-wide mb-0.5 rounded-2xl py-1 px-2 flex items-center gap-1 josefin-sans"
                    >
                      <span
                        style={{
                          backgroundColor: getCategoryConfig(catSlug!)
                            .textColor,
                        }}
                        className="rounded-full size-1.25 font-semibold"
                      />
                      {firstTag}
                    </div>
                  )}
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="font-medium text-sm text-subtle line-clamp-1"
                  >
                    {truncateText(recipe.title, 3)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/categories"
          className="w-full flex items-center justify-center text-white gap-3 py-4 bg-mint-green hover:opacity-90 transition-opacity rounded-full font-medium"
        >
          See all categories <MoveRight size={16} color="#FFFFFF" />
        </Link>
      </main>
    </div>
  );
};

export default page;
