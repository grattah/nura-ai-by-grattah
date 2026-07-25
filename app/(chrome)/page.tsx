import Link from "next/link";
import Image from "next/image";
import {
  createServiceRoleClient,
  getCachedUser,
  createClient,
} from "@/lib/supabase/server";
import { SearchSection } from "@/components/home/search-section";
import { RecipeCardNew } from "@/components/home/recipe-card-new";
import { CategorySection } from "@/components/home/category-section";
import { UpgradeBanner } from "@/components/home/upgrade-banner";
import { getBookmarkedIds } from "@/actions/bookmark";
import { withTiming } from "@/lib/perf";
import { getCategories } from "@/actions/categories";
import { MoveRight } from "lucide-react";
import { FreeTokensModal } from "@/components/tokens/FreeTokensModal";

type RecipeWithTags = {
  id: string;
  title: string;
  image_url: string | null;
  recipe_categories: Array<{
    score: number;
    qualified: boolean;
    categories: { name: string; slug: string } | null;
  }>;
};

// The recipe's strongest QUALIFYING category (highest CategoryScore) for the
// card label. Recipes that qualify for nothing get no badge.
function topCategory(
  recipe: RecipeWithTags,
): { name: string; slug: string } | null {
  const top = [...(recipe.recipe_categories ?? [])]
    .filter((rc) => rc.qualified && rc.categories)
    .sort((a, b) => b.score - a.score)[0];
  return top?.categories ?? null;
}

// Fetched fresh per request — no cross-request cache, so new/re-scored recipes
// surface immediately.
async function getPopularRecipes() {
  const supabase = createServiceRoleClient();
  return supabase
    .from("recipes")
    .select("id, title, image_url, recipe_categories(score, qualified, categories(name, slug))")
    .eq("status" as never, "approved" as never)
    .or("shares.gt.0, saves.gt.0, comments.gt.0, likes.gt.0")
    .order("weighted_score", { ascending: false })
    .order("last_engaged_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(30);
}

export default async function HomePage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: rawRecipes },
  ] = await Promise.all([
    withTiming("home:getCachedUser", () => getCachedUser()),
    withTiming("home:getPopularRecipes", () => getPopularRecipes()),
  ]);

  function oneRecipePerCategory(recipes: RecipeWithTags[]): RecipeWithTags[] {
    const seenTags = new Set<string>();
    const result: RecipeWithTags[] = [];
    for (const recipe of recipes) {
      const firstTag = topCategory(recipe)?.name ?? null;
      if (firstTag !== null) {
        if (seenTags.has(firstTag)) continue;
        seenTags.add(firstTag);
      }
      result.push(recipe);
    }
    return result;
  }

  const recipes = (rawRecipes ?? []) as unknown as RecipeWithTags[];
  const popularRecipes = oneRecipePerCategory(recipes).slice(0, 6);

  const bookmarkedIds = new Set<string>();
  if (user) {
    const ids = await withTiming("home:getBookmarkedIds", () =>
      getBookmarkedIds(popularRecipes.map((r) => r.id)),
    );
    ids.forEach((id) => bookmarkedIds.add(id));
  }

  // Non-mutating read: whether to offer the one-time welcome modal. The flag is
  // flipped by the modal on the client (real mount), never during this render —
  // so prefetch/background renders can't consume it.
  let showFreeTokens = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_seen_free_tokens")
      .eq("id", user.id)
      .maybeSingle();
    showFreeTokens = !!profile && !profile.has_seen_free_tokens;
  }

  const categories = await getCategories();

  return (
    <div className="bg-background">
      <main className="px-mp pt-2 space-y-8">
        {/* Hero */}
        <section className="relative m-0">
          {/* <h1 className="text-title font-semibold text-grey-c950 leading-snug z-10 relative">
            What’s bugging you today?
          </h1> */}
          {/* <SearchSection /> */}
          <Image
            src="/search-sec-flower.svg"
            alt="flower"
            width={121}
            height={159}
            className="absolute -right-3.5 -top-12 z-0"
          />
        </section>

        {/* Popular Recipes */}
        <section className="relative z-10 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-title leading-none font-semibold text-grey-c950">
              Trending this week
            </h2>
            <Link
              href="/popular"
              className="text-sm font-semibold text-mint-green hover:opacity-75 transition-opacity py-1 px-3 rounded-full bg-[#F3F1E8]"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-8">
            {popularRecipes.map((recipe, i) => {
              const cat = topCategory(recipe);
              const firstTag = cat?.name;
              const catSlug = cat?.slug;
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

        <div className="border border-[#D3CCBD] rounded-3xl pt-12.5 pb-16 pl-10 pr-9 relative flex flex-col overflow-hidden">
          <p className="text-base text-[#312817] alan-sans z-10 relative max-w-69.5">
            Your energy dipped this week? A beef & ginger juice could lift the
            afternoon slump - want the recipe?
          </p>
          <Link
            href={`/recipes/2307da01-c7a9-4b35-a581-526ae8f5339c`}
            className="z-10 absolute right-6 bottom-6 bg-mint-green self-end w-fit text-white rounded-full px-6 py-3 flex items-center gap-x-1 transition-transform active:scale-[0.98]"
          >
            <span className="alan-sans font-semibold text-sm">View</span>
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

        {/* Categories */}
        <CategorySection categories={categories} />

        {/* Upgrade / Pending banner */}
        <UpgradeBanner />
      </main>
      {showFreeTokens && user && <FreeTokensModal userId={user.id} />}
    </div>
  );
}
