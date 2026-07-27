import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import { FollowUpSection } from "@/components/follow-up-section";
import { buildRecipeContext } from "@/lib/recipe-context";
import { AuthGate } from "@/components/auth/auth-gate";
import { ShareButton } from "@/components/share-button";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { isBookmarked } from "@/actions/bookmark";
import { BookmarkButton } from "@/components/bookmark-button";
import BackButton from "@/components/back-button";
import { DetoxCard } from "@/components/recipe/DetoxCard";
import { RecipeSupports } from "@/components/recipe/RecipeSupports";
import { RecipeHeroImage } from "@/components/recipe/RecipeHeroImage";
import { RecipeScoreTrigger } from "@/components/recipe/RecipeScoreTrigger";
import { RecipePersonalizeTrigger } from "@/components/recipe/RecipePersonalizeTrigger";
import SafetyAlerts, {
  type SafetyAlertItem,
} from "@/components/recipe/SafetyAlerts";
import NutritionScore from "@/components/recipe/NutritionScore";
import { computeMatchScore } from "@/lib/scoring/match-score";
import { hasActiveSubscription } from "@/lib/subscription";
import Comment from "@/components/recipe/Comment";
import AccordionSection from "@/components/recipe/AccordionSection";
import LikeButton from "@/components/recipe/LikeButton";
import { logRecipeView } from "@/actions/activity";
import { isLiked } from "@/actions/likes";
import type { Database } from "@/lib/database.types";
import type { NutritionFacts } from "@/lib/types";
import type { SupportScore } from "@/lib/wellness-score";
import { BookmarkProvider } from "@/components/bookmark-provider";
import PersonalizedTokenModal from "@/components/tokens/PersonalizedTokenModal";

type RecipeRecord = Database["public"]["Tables"]["recipes"]["Row"] & {
  recipe_tags:
    | { score: number | null; tags: { name: string; slug: string } | null }[]
    | null;
};

interface Comment {
  id: string;
  profiles: Profile;
  content: string;
  created_At: string;
  likes: number;
  hasLiked?: boolean;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
}

const RECIPE_SELECT = "*, recipe_tags(score, tags(name, slug))";

// The recipe's strongest bioactivities (from recipe_tags) for the supports card.
function topBioactivities(
  recipeTags: RecipeRecord["recipe_tags"],
  count = 5,
): SupportScore[] {
  return (recipeTags ?? [])
    .flatMap((rt) =>
      rt.tags && rt.score != null
        ? [{ slug: rt.tags.slug, support: rt.tags.name, score: rt.score }]
        : [],
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

const getRecipe = cache(async (id: string): Promise<RecipeRecord | null> => {
  const admin = createServiceRoleClient();
  const { data: approved } = await admin
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .eq("status" as never, "approved" as never)
    .maybeSingle();
  if (approved) return approved as unknown as RecipeRecord;

  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .single();
  return (data as unknown as RecipeRecord) ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/recipes/${recipe.id}`;

  return {
    title: recipe.title,
    description: recipe.short_description,
    openGraph: {
      title: recipe.title,
      description: recipe.short_description,
      images: recipe.image_url ? [{ url: recipe.image_url }] : [],
      url,
      type: "article",
    },
    other: {
      "fb:app_id": process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!,
    },
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [recipe, supabase] = await Promise.all([getRecipe(id), createClient()]);

  if (!recipe) return notFound();

  logRecipeView(recipe.id);

  const [
    bookmarked,
    liked,
    {
      data: { user },
    },
    { data: latestComment },

    { count: totalCommentCount },
  ] = await Promise.all([
    isBookmarked(recipe.id),
    isLiked(recipe.id),
    supabase.auth.getUser(),
    supabase
      .from("comments")
      .select(
        `
    id,
    content,
    created_at,
    likes,
    profiles (id, username, avatar_url),
    comment_likes!comment_id (user_id)
  `,
      )
      .eq("recipe_id", recipe.id)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("recipe_id", recipe.id)
      .is("parent_id", null),
  ]);

  const latestCommentWithLike = latestComment
    ? {
        ...latestComment,
        hasLiked:
          latestComment.comment_likes?.some(
            (like: { user_id: string }) => like.user_id === user?.id,
          ) ?? false,
      }
    : null;

  const ingredients =
    (recipe.ingredients as Array<{ emoji: string; label: string }>) ?? [];

  const howToMake =
    (recipe.how_to_make as Array<{ step: string; instruction: string }>) ?? [];

  const nutrition = (recipe.nutrition as NutritionFacts | null) ?? null;

  const shareDisabled = (recipe as { status?: string }).status !== "approved";

  let personalizedView = false;
  let matchScore: number | null = null;
  let personalizedAlerts: SafetyAlertItem[] = [];
  let needsSafetyAlerts = false;
  if (user) {
    const [isSub, profileRes, cacheRes] = await Promise.all([
      hasActiveSubscription(supabase, user.id),
      supabase
        .from("health_profiles" as never)
        .select("updated_at, conditions, goals")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("recipe_personalized_scores" as never)
        .select("safety_alerts, profile_updated_at")
        .eq("user_id", user.id)
        .eq("recipe_id", recipe.id)
        .maybeSingle(),
    ]);
    const profile = profileRes.data as {
      updated_at?: string;
      conditions?: string[];
      goals?: string[];
    } | null;
    const profileUpdatedAt = profile?.updated_at ?? null;
    personalizedView = isSub && !!profileUpdatedAt;
    if (personalizedView && recipe.final_score_10 != null) {
      // Fresh match, computed from the recipe's current scores + the profile.
      const bioBySlug: Record<string, number> = {};
      for (const rt of recipe.recipe_tags ?? []) {
        if (rt.tags?.slug && rt.score != null)
          bioBySlug[rt.tags.slug] = rt.score;
      }
      const match = computeMatchScore({
        bioBySlug,
        points: {
          sugar: recipe.sugar_points ?? 0,
          salt: recipe.salt_points ?? 0,
          satFat: recipe.sat_fat_points ?? 0,
          energy: recipe.energy_points ?? 0,
          fiber: recipe.fiber_points ?? 0,
          protein: recipe.protein_points ?? 0,
        },
        track: recipe.track ?? "Solid Food",
        ironRich: !!recipe.iron_rich,
        waterContentPercent: recipe.water_content_pct ?? 0,
        conditions: profile?.conditions ?? [],
        goals: profile?.goals ?? [],
      });
      matchScore = match.score;

      const cache = cacheRes.data as {
        safety_alerts: SafetyAlertItem[] | null;
        profile_updated_at: string;
      } | null;
      const safetyFresh =
        !!cache &&
        new Date(cache.profile_updated_at) >= new Date(profileUpdatedAt!);
      if (safetyFresh && cache) personalizedAlerts = cache.safety_alerts ?? [];
      else needsSafetyAlerts = true;
    }
  }
  return (
    <AuthGate>
      <BookmarkProvider
        recipeId={recipe.id}
        initialBookmarked={bookmarked}
        isAuthenticated={!!user}
      >
        <div className="min-h-screen bg-background">
          {/* Sub-header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <BackButton className="size-10 grid place-items-center rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
            {/* <div className="flex items-center gap-2">
              <ShareButton
                recipeId={recipe.id}
                recipeTitle={recipe.title}
                addText=""
                text=""
                disabled={shareDisabled}
              />
              <BookmarkButton text="" addText="" popularStyle="" />
            </div> */}
          </div>

          <main className="pb-6">
            {/* Hero image — LCP element; fills in async for freshly generated recipes */}
            <RecipeHeroImage
              recipeId={recipe.id}
              title={recipe.title}
              initialImageUrl={recipe.image_url}
            />

            {/* Title + description */}
            <div className="px-6 mb-8">
              <h1 className="text-2xl font-bold text-foreground mb-1.5 leading-tight">
                {recipe.title}
              </h1>
              <p className="text-base font-medium text-subtle leading-relaxed">
                {recipe.short_description}
              </p>
            </div>

            <div className="px-6 mb-8 space-y-4">
              {/* Safety alerts (allergy / medication) — above the supports card
                  when the personalized evaluation flagged any. */}
              {personalizedView && personalizedAlerts.length > 0 && (
                <SafetyAlerts alerts={personalizedAlerts} />
              )}
              <RecipeScoreTrigger
                recipeId={recipe.id}
                canTrigger={
                  !!user &&
                  (recipe as { created_by?: string | null }).created_by ===
                    user.id &&
                  (recipe.final_score_10 == null ||
                    (recipe.recipe_tags?.length ?? 0) === 0)
                }
              />
              <RecipeSupports
                supports={topBioactivities(recipe.recipe_tags, 5)}
              />
              {/* Base + match when we can personalize; otherwise fall back to the
                  default card (nutrition % + "complete profile" CTA). A profiled
                  subscriber with no goals AND no conditions has nothing to match
                  against, so matchScore is null and they get the default too. */}
              {personalizedView && matchScore != null ? (
                <NutritionScore
                  baseScore={recipe.final_score_10 ?? 0}
                  personalizedScore={Math.round(matchScore)}
                />
              ) : (
                <DetoxCard
                  finalScore={
                    recipe.final_score_10 != null
                      ? Math.round(recipe.final_score_10 * 10)
                      : null
                  }
                />
              )}

              {/* Safety alerts are cached separately and don't depend on the match
                  score — keep this trigger independent of the card above, or users
                  who DO have a match score would never have their alerts computed.
                  Renders no visible chrome once the alerts are cached. */}
              {personalizedView && needsSafetyAlerts && (
                <RecipePersonalizeTrigger recipeId={recipe.id} canTrigger />
              )}
            </div>

            {/* Accordion sections */}
            <div className="px-6 space-y-3">
              <AccordionSection
                recipe={recipe}
                ingredients={ingredients}
                howToMake={howToMake}
                nutrition={nutrition}
              />

              {/* Follow-up questions + RAG chat */}
              <div className="pt-2">
                <FollowUpSection
                  contextId={recipe.id}
                  contextType="recipe"
                  title={recipe.title}
                  description={recipe.short_description}
                  context={buildRecipeContext(recipe)}
                  savedQuestions={recipe.follow_up_questions}
                />
              </div>

              {/* Almost-out token warning — only on freshly generated (pending)
                  recipes, not the seeded/approved catalogue. Self-hides unless low. */}
              {shareDisabled && <PersonalizedTokenModal />}

              <div className="flex justify-between items-center gap-2 mt-8">
                <div className="flex items-center gap-2 flex-1">
                  <p className="text-subtle text-sm text-nowrap">
                    Was this helpful?
                  </p>
                  <LikeButton
                    recipeId={recipe.id}
                    initialLiked={liked}
                    isAuthenticated={!!user}
                  />
                </div>
                <p className="font-medium text-sm flex-1 text-nowrap">
                  {recipe.likes ?? 0}{" "}
                  {(recipe.likes ?? 0) > 1 ? "people" : "person"} found this
                  helpful
                </p>
              </div>

              <div className="flex gap-4 items-center mt-8 w-full">
                <ShareButton
                  recipeId={recipe.id}
                  recipeTitle={recipe.title}
                  text="Send this to a friend"
                  addText="show"
                  disabled={shareDisabled}
                />

                <BookmarkButton
                  text="Save this recipe"
                  addText="show"
                  popularStyle=""
                />
              </div>

              <div className="mt-8">
                <Comment
                  total={totalCommentCount ?? 0}
                  latestComment={latestCommentWithLike}
                  seeAllHref={`/comments?recipeId=${recipe.id}&limit=5`}
                  recipeId={recipe.id}
                  isAuthenticated={!!user}
                />
              </div>
            </div>
          </main>
        </div>
      </BookmarkProvider>
    </AuthGate>
  );
}
