import Link from "next/link";
import { MoveRight } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { truncateText } from "@/lib/truncate-text";
import { fetchPopularRecipesOnePerDrinkType } from "@/lib/popular-recipes";
import BackButton from "@/components/back-button";
import { getDrinkTypeBadge, drinkTypeName } from "@/lib/drink-types";

const page = async () => {
  const supabase = await createClient();
  const recipes = await fetchPopularRecipesOnePerDrinkType(supabase, 20);

  return (
    <div className="bg-background pb-10 min-h-dvh flex flex-col">
      <div className="px-6 pt-3 flex flex-col gap-10 flex-1">
        <div className="flex items-center justify-between">
          <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <p className="font-semibold text-xl">Popular Recipes</p>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-3 space-y-3">
          {recipes.map((recipe) => {
            const drinkType: string | null = recipe.drink_type ?? null;
            const badge = getDrinkTypeBadge(drinkType);
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
                  {drinkType && (
                    <div
                      style={{
                        backgroundColor: badge.bgColor,
                        color: badge.textColor,
                      }}
                      className="w-fit mb-0.5 rounded-2xl py-1 px-2 flex items-center gap-1 josefin-sans"
                    >
                      <span
                        style={{ backgroundColor: badge.textColor }}
                        className="rounded-full size-1.25"
                      />
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {drinkTypeName(drinkType)}
                      </span>
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
          className="w-full mt-auto flex items-center justify-center text-white gap-3 py-4 bg-mint-green hover:opacity-90 transition-opacity rounded-full font-medium"
        >
          See all categories <MoveRight size={16} color="#FFFFFF" />
        </Link>
      </div>
    </div>
  );
};

export default page;
