import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import { FollowUpSection } from "@/components/follow-up-section";
import { buildRecipeContext } from "@/lib/recipe-context";
import { PaywallGate } from "@/components/paywall/paywall-gate";
import { ShareButton } from "@/components/share-button";
import { createClient } from "@/lib/supabase/server";
import { isBookmarked } from "@/actions/bookmark";
import { BookmarkButton } from "@/components/bookmark-button";
import BackButton from "@/components/back-button";
import { DetoxCard } from "@/components/recipe/DetoxCard";
import { RecipeHeroImage } from "@/components/recipe/RecipeHeroImage";
import Comment from "@/components/recipe/Comment";
import AccordionSection from "@/components/recipe/AccordionSection";
import LikeButton from "@/components/recipe/LikeButton";
import { logRecipeView } from "@/actions/activity";
import { isLiked } from "@/actions/likes";
import type { Database } from "@/lib/database.types";
import type { SupportScore } from "@/lib/wellness-score";
import { BookmarkProvider } from "@/components/bookmark-provider";

// support_scores isn't in the generated types yet; recipe_tags is a join.
type RecipeRecord = Database["public"]["Tables"]["recipes"]["Row"] & {
  support_scores: SupportScore[] | null;
  recipe_tags: { tags: { name: string; slug: string } | null }[] | null;
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

// React cache deduplicates this fetch — generateMetadata and the page
// both call getRecipe(id) but Supabase is only queried once per request
const getRecipe = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, recipe_tags(tags(name, slug))")
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

    { data: totalComments },
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
      .select("*")
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

  // The recipe's assigned wellness supports (its tags) for the DetoxCard.
  const assignedSupports = (recipe.recipe_tags ?? [])
    .map((rt) => rt.tags)
    .filter((t): t is { name: string; slug: string } => !!t)
    .map((t) => ({ name: t.name, slug: t.slug }));

  const shareDisabled = (recipe as { status?: string }).status !== "approved";

  return (
    <PaywallGate>
      <BookmarkProvider
        recipeId={recipe.id}
        initialBookmarked={bookmarked}
        isAuthenticated={!!user}
      >
        <div className="min-h-screen bg-background">
          {/* Sub-header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <BackButton className="p-3 max-xs:p-2 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
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
              <h1 className="text-2xl max-xs:text-base font-bold text-foreground mb-1.5 leading-tight">
                {recipe.title}
              </h1>
              <p className="text-base max-xs:text-sm font-medium text-subtle leading-relaxed">
                {recipe.short_description}
              </p>
            </div>

            <div className="px-6 mb-8">
              <DetoxCard
                recipeId={recipe.id}
                supports={assignedSupports}
                initialScores={recipe.support_scores}
              />
            </div>

            {/* Accordion sections */}
            <div className="px-6 space-y-3">
              <AccordionSection
                recipe={recipe}
                ingredients={ingredients}
                howToMake={howToMake}
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

              <div className="flex justify-between items-center gap-2 mt-8">
                <div className="flex items-center gap-2 flex-1">
                  <p className="text-subtle text-sm max-xs:text-xs max-2xs:text-[10.5px] text-nowrap">
                    Was this helpful?
                  </p>
                  <LikeButton
                    recipeId={recipe.id}
                    initialLiked={liked}
                    isAuthenticated={!!user}
                  />
                </div>
                <p className="font-medium text-sm max-xs:text-xs max-2xs:text-[10.5px] flex-1 text-nowrap">
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
                  total={totalComments?.length}
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
    </PaywallGate>
  );
}
