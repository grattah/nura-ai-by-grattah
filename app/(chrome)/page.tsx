import Link from "next/link";
import { unstable_cache } from "next/cache";
import {
  createClient,
  createServiceRoleClient,
  getCachedUser,
} from "@/lib/supabase/server";
import { SearchSection } from "@/components/home/search-section";
import { RecipeCardNew } from "@/components/home/recipe-card-new";
import { WellnessTipCard } from "@/components/home/wellness-tip-card";
import { CategorySection } from "@/components/home/category-section";
import { UpgradeBanner } from "@/components/home/upgrade-banner";
import { getBookmarkedIds } from "@/actions/bookmark";
import { withTiming } from "@/lib/perf";

type RecipeWithTags = {
  id: string;
  title: string;
  image_url: string | null;
  recipe_tags: Array<{ tags: { name: string; slug: string } | null }>;
};

// Static wellness tip — swap for a DB-driven fetch when ready
const WELLNESS_TIP = {
  title: "Chew a little longer",
  description:
    "Digestion begins in the mouth. Twenty unhurried chews per bite can noticeably reduce bloating.",
  imageUrl: undefined as string | undefined,
};

const getPopularRecipes = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient();
    return (
      supabase
        .from("recipes")
        .select("id, title, image_url, recipe_tags(tags(name, slug))")
        // Service role bypasses RLS, so filter out pending recipes explicitly.
        // `status` was added in migration 20260615120000 (not in generated types yet).
        .eq("status" as never, "approved" as never)
        .or("shares.gt.0, saves.gt.0, comments.gt.0, likes.gt.0")
        .order("weighted_score", { ascending: false })
        .order("last_engaged_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(10)
    );
  },
  ["home-popular-recipes"],
  { revalidate: 300 },
);

export default async function HomePage() {
  const [
    {
      data: { user },
    },
    { data: rawRecipes },
  ] = await Promise.all([
    withTiming("home:getCachedUser", () => getCachedUser()),
    withTiming("home:getPopularRecipes", () => getPopularRecipes()),
  ]);

  const recipes = (rawRecipes ?? []) as unknown as RecipeWithTags[];
  const popularRecipes = recipes.slice(0, 5);

  // Check subscription status server-side
  let hasAccess = false;
  const bookmarkedIds = new Set<string>();
  if (user) {
    const supabase = await createClient();
    const [{ data: sub }, ids] = await Promise.all([
      withTiming("home:subscription", async () =>
        supabase
          .from("subscriptions")
          .select("status, expires_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
      ),
      withTiming("home:getBookmarkedIds", () =>
        getBookmarkedIds(popularRecipes.map((r) => r.id)),
      ),
    ]);
    hasAccess =
      !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());
    ids.forEach((id) => bookmarkedIds.add(id));
  }

  return (
    <div className="bg-background">
      <main className="px-6 pt-2 max-xs:space-y-5 space-y-6">
        {/* Hero */}
        <section className="max-xs:space-y-3 space-y-4">
          <h1 className="max-2xs:text-lg max-xs:text-xl text-[1.75rem] font-semibold text-grey-c950 leading-snug">
            Hello! what would you like to{" "}
            <span className="text-mint-green">improve</span> today?
          </h1>
          <SearchSection />
        </section>

        {/* Popular Recipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="max-xs:text-base text-2xl leading-none font-semibold text-grey-c950">
              Popular recipes
            </h2>
            <Link
              href="/popular"
              className="max-xs:text-xs text-base font-semibold text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4"
            >
              See all
            </Link>
          </div>

          <div className="">
            <div className="flex max-xs:gap-x-2.5 gap-x-5 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
              {popularRecipes.map((recipe, i) => {
                const firstTag = recipe.recipe_tags?.[0]?.tags?.name;
                return (
                  <div
                    key={recipe.id}
                    className="shrink-0 max-xs:w-33 w-50 snap-start"
                  >
                    <RecipeCardNew
                      id={recipe.id}
                      title={recipe.title}
                      imageUrl={recipe.image_url ?? undefined}
                      category={firstTag}
                      href={`/recipes/${recipe.id}`}
                      priority={i < 2}
                      initialBookmarked={bookmarkedIds.has(recipe.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Daily Wellness Tip */}
        <WellnessTipCard
          title={WELLNESS_TIP.title}
          description={WELLNESS_TIP.description}
          imageUrl={WELLNESS_TIP.imageUrl}
        />

        {/* Categories */}
        <CategorySection hasAccess={hasAccess} />

        {/* Upgrade / Pending banner */}
        <UpgradeBanner hasAccess={hasAccess} />
      </main>
    </div>
  );
}
