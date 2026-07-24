import type { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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
  count = 5
): SupportScore[] {
  return (recipeTags ?? [])
    .flatMap((rt) =>
      rt.tags && rt.score != null
        ? [{ slug: rt.tags.slug, support: rt.tags.name, score: rt.score }]
        : []
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

const getCachedApprovedRecipe = (id: string) =>
  unstable_cache(
    async () => {
      const admin = createServiceRoleClient();
      const { data } = await admin
        .from("recipes")
        .select(RECIPE_SELECT)
        .eq("id", id)
        .eq("status" as never, "approved" as never)
        .maybeSingle();
      return data ? (data as unknown as RecipeRecord) : null;
    },
    ["recipe-detail", id],
    { revalidate: 300, tags: [`recipe-${id}`] }
  )();

// React cache deduplicates within a request — generateMetadata and the page
// both call getRecipe(id) but it resolves once per request.
const getRecipe = cache(async (id: string): Promise<RecipeRecord | null> => {
  const cached = await getCachedApprovedRecipe(id);
  if (cached) return cached;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as RecipeRecord;
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
  `
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
            (like: { user_id: string }) => like.user_id === user?.id
          ) ?? false,
      }
    : null;

  const ingredients =
    (recipe.ingredients as Array<{ emoji: string; label: string }>) ?? [];

  const howToMake =
    (recipe.how_to_make as Array<{ step: string; instruction: string }>) ?? [];

  const nutrition = (recipe.nutrition as NutritionFacts | null) ?? null;

  const shareDisabled = (recipe as { status?: string }).status !== "approved";

  // ── Personalized nutrition score + safety alerts ──────────────────────────
  // Shown to a subscriber who has a health profile; generated on demand (lazily)
  // and cached per (user, recipe), regenerated only when the profile is newer.
  let personalizedView = false;
  let personalizedScore: number | null = null;
  let personalizedAlerts: SafetyAlertItem[] = [];
  let canPersonalize = false;
  if (user) {
    const [isSub, profileRes, cacheRes] = await Promise.all([
      hasActiveSubscription(supabase, user.id),
      supabase
        .from("health_profiles" as never)
        .select("updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("recipe_personalized_scores" as never)
        .select(
          "personalized_final_score, base_final_score, safety_alerts, profile_updated_at"
        )
        .eq("user_id", user.id)
        .eq("recipe_id", recipe.id)
        .maybeSingle(),
    ]);
    const profileUpdatedAt =
      (profileRes.data as { updated_at?: string } | null)?.updated_at ?? null;
    personalizedView = isSub && !!profileUpdatedAt;
    if (personalizedView) {
      const cache = cacheRes.data as {
        personalized_final_score: number | null;
        base_final_score: number | null;
        safety_alerts: SafetyAlertItem[] | null;
        profile_updated_at: string;
      } | null;
      const baseScored = recipe.final_score != null;
      const fresh =
        !!cache &&
        baseScored &&
        cache.base_final_score === recipe.final_score &&
        new Date(cache.profile_updated_at) >= new Date(profileUpdatedAt!);
      if (fresh && cache) {
        personalizedScore = cache.personalized_final_score;
        personalizedAlerts = cache.safety_alerts ?? [];
      } else {
        canPersonalize = baseScored;
      }
    }
  }

  // Recipe detail is a public page; its premium components (ingredients, how-to,
  // share, bookmark, comments, follow-up…) gate GUESTS to the sign-in modal via
  // AuthGate. Authenticated users view freely — only the follow-up chat is paid.
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
            <div className="flex items-center gap-2">
              <ShareButton
                recipeId={recipe.id}
                recipeTitle={recipe.title}
                addText=""
                text=""
                disabled={shareDisabled}
              />
              <BookmarkButton text="" addText="" popularStyle="" />
            </div>
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

              {/* Generated recipes are created unscored; the owner's first view
                  scores them (bioactivity + categories + nutrition), then the
                  page refreshes and the cards below fill in. */}
              <RecipeScoreTrigger
                recipeId={recipe.id}
                canTrigger={
                  !!user &&
                  (recipe as { created_by?: string | null }).created_by ===
                    user.id &&
                  (recipe.final_score == null ||
                    (recipe.recipe_tags?.length ?? 0) === 0)
                }
              />
              <RecipeSupports
                supports={topBioactivities(recipe.recipe_tags, 5)}
              />

              {/* Personalized (subscriber + profile) shows base vs personalized
                  nutrition; otherwise the base DetoxCard + "complete profile" CTA. */}
              {personalizedView ? (
                personalizedScore != null ? (
                  <NutritionScore
                    baseScore={recipe.final_score ?? 0}
                    personalizedScore={personalizedScore}
                  />
                ) : (
                  <RecipePersonalizeTrigger
                    recipeId={recipe.id}
                    canTrigger={canPersonalize}
                  />
                )
              ) : (
                <DetoxCard finalScore={recipe.final_score ?? null} />
              )}
              <NutritionScore baseScore={6.7} personalizedScore={72} />
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
