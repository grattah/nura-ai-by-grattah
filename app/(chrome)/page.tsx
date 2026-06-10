import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchSection } from "@/components/home/search-section";
import { RecipeCardNew } from "@/components/home/recipe-card-new";
import { WellnessTipCard } from "@/components/home/wellness-tip-card";
import { CategorySection } from "@/components/home/category-section";
import { UpgradeBanner } from "@/components/home/upgrade-banner";

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

export default async function HomePage() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: rawRecipes },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("recipes")
      .select("id, title, image_url, recipe_tags(tags(name, slug))")
      .order("display_order", { ascending: true })
      .limit(10),
  ]);

  // Check subscription status server-side
  let hasAccess = process.env.NEXT_PUBLIC_DEV_BYPASS_PAYWALL === "true";
  if (!hasAccess && user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, expires_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    hasAccess =
      !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());
  }

  const recipes = (rawRecipes ?? []) as unknown as RecipeWithTags[];

  return (
    <div className="bg-background">
      <main className="px-4 pt-2 space-y-6">
        {/* Hero */}
        <section className="space-y-4">
          <h1 className="text-[1.75rem] font-semibold text-grey-c950 leading-snug">
            Hello! what would you like to{" "}
            <span className="text-mint-green">improve</span> today?
          </h1>
          <SearchSection />
        </section>

        {/* Popular Recipes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl leading-none font-semibold text-grey-c950">
              Popular recipes
            </h2>
            <Link
              href="/recipes"
              className="text-base text-mint-green hover:opacity-75 transition-opacity underline underline-offset-4"
            >
              See all
            </Link>
          </div>

          <div className="">
            <div className="flex gap-x-5 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
              {recipes.slice(0, 5).map((recipe, i) => {
                const firstTag = recipe.recipe_tags?.[0]?.tags?.name;
                return (
                  <div key={recipe.id} className="shrink-0 w-50 snap-start">
                    <RecipeCardNew
                      id={recipe.id}
                      title={recipe.title}
                      imageUrl={recipe.image_url ?? undefined}
                      category={firstTag}
                      href={`/recipes/${recipe.id}`}
                      priority={i < 2}
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
