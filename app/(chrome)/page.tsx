import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { createServiceRoleClient, getCachedUser, createClient } from "@/lib/supabase/server";
import { SearchSection } from "@/components/home/search-section";
import { RecipeCardNew } from "@/components/home/recipe-card-new";
import { WellnessTipCard } from "@/components/home/wellness-tip-card";
import { CategorySection } from "@/components/home/category-section";
import { UpgradeBanner } from "@/components/home/upgrade-banner";
import { getBookmarkedIds } from "@/actions/bookmark";
import { withTiming } from "@/lib/perf";
import { getDailyTip, utcDayKey, FALLBACK_TIP } from "@/lib/daily-tip";
import { getCategories } from "@/actions/categories";
import { MoveRight } from "lucide-react";
import { FreeTokensModal } from "@/components/tokens/FreeTokensModal";

type RecipeWithTags = {
  id: string;
  title: string;
  image_url: string | null;
  recipe_tags: Array<{ tags: { name: string; slug: string } | null }>;
};

// Static wellness tip — swap for a DB-driven fetch when ready
const getPopularRecipes = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient();
    return supabase
      .from("recipes")
      .select("id, title, image_url, recipe_tags(tags(name, slug))")
      .eq("status" as never, "approved" as never)
      .or("shares.gt.0, saves.gt.0, comments.gt.0, likes.gt.0")
      .order("weighted_score", { ascending: false })
      .order("last_engaged_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(30);
  },
  ["home-popular-recipes"],
  { revalidate: 300 },
);

export default async function HomePage() {
  const supabase = await createClient();

  const { data: showFreeTokens } = await supabase.rpc(
    "claim_free_tokens_redirect"
  );

  const [
    {
      data: { user },
    },
    { data: rawRecipes },
    dailyTipRow,
  ] = await Promise.all([
    withTiming("home:getCachedUser", () => getCachedUser()),
    withTiming("home:getPopularRecipes", () => getPopularRecipes()),
    withTiming("home:getDailyTip", () => getDailyTip(utcDayKey())),
  ]);

  function oneRecipePerCategory(recipes: RecipeWithTags[]): RecipeWithTags[] {
    const seenTags = new Set<string>();
    const result: RecipeWithTags[] = [];
    for (const recipe of recipes) {
      const firstTag = recipe.recipe_tags?.[0]?.tags?.name ?? null;
      if (firstTag !== null) {
        if (seenTags.has(firstTag)) continue;
        seenTags.add(firstTag);
      }
      result.push(recipe);
    }
    return result;
  }

  const dailyTip = dailyTipRow ?? FALLBACK_TIP;

  const recipes = (rawRecipes ?? []) as unknown as RecipeWithTags[];
  const popularRecipes = oneRecipePerCategory(recipes).slice(0, 4);

  const bookmarkedIds = new Set<string>();
  if (user) {
    const ids = await withTiming("home:getBookmarkedIds", () =>
      getBookmarkedIds(popularRecipes.map((r) => r.id)),
    );
    ids.forEach((id) => bookmarkedIds.add(id));
  }

  const categories = await getCategories();

  return (
    <div className="bg-background">
      <main className="px-mp pt-2 space-y-8">
        {/* Hero */}
        <section className="space-y-4 relative">
          <h1 className="text-title font-semibold text-grey-c950 leading-snug z-10 relative">
            What’s bugging you today?
          </h1>
          <SearchSection />
          <Image
            src="/search-sec-flower.svg"
            alt="flower"
            width={121}
            height={159}
            className="absolute -right-3.5 -top-12 z-0"
          />
        </section>

        {/* Popular Recipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title leading-none font-semibold text-grey-c950">
              Popular recipes
            </h2>
            <Link
              href="/popular"
              className="text-base font-semibold text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-8">
            {popularRecipes.map((recipe, i) => {
              const firstTag = recipe.recipe_tags?.[0]?.tags?.name;
              const catSlug = recipe.recipe_tags?.[0]?.tags?.slug;
              return (
                <RecipeCardNew
                  key={recipe.id}
                  id={recipe.id}
                  title={recipe.title}
                  imageUrl={recipe.image_url ?? undefined}
                  category={firstTag}
                  catSlug={catSlug}
                  href={`/recipes/${recipe.id}`}
                  priority={i < 2}
                  initialBookmarked={bookmarkedIds.has(recipe.id)}
                />
              );
            })}
          </div>
        </section>

        <div className="border border-[#D3CCBD] rounded-3xl py-10 px-9 relative flex flex-col overflow-hidden">
          <p className="text-base text-[#312817] font-alanSans z-10 relative">
            Your energy dipped this week? A beef & ginger juice could lift the
            afternoon slump - want the recipe?
          </p>
          <Link
            href={`/recipes/2307da01-c7a9-4b35-a581-526ae8f5339c`}
            className="z-10 relative bg-mint-green self-end w-fit text-white rounded-full px-3 py-2.5 flex items-center gap-x-1 transition-transform active:scale-[0.98]"
          >
            <span className="font-alanSans font-semibold text-sm">View</span>
            <MoveRight className="size-3.5" />
          </Link>
          <Image
            src="/bottom-right-flower.svg"
            alt="flower"
            width={101}
            height={63}
            className="absolute right-0 bottom-0 z-0"
          />
          <Image
            src="/right-wellness-fruit.svg"
            alt="flower"
            width={25}
            height={18}
            className="absolute top-2 right-0 z-0"
          />
          <Image
            src="/left-wellness-flower.svg"
            alt="flower"
            width={88}
            height={115}
            className="absolute -top-2.5 left-0 z-0 pointer-events-none"
          />
        </div>

        {/* Daily Wellness Tip */}
        {/* <WellnessTipCard
          title={dailyTip.title}
          description={dailyTip.description}
          imageUrl={dailyTip.imageUrl}
          stale={!dailyTipRow}
        /> */}

        {/* Categories */}
        <CategorySection categories={categories} />

        {/* Upgrade / Pending banner */}
        <UpgradeBanner />
      </main>
      { showFreeTokens && <FreeTokensModal /> }
    </div>
  );
}
