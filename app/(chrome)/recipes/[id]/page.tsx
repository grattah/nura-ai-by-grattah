import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Heart } from "lucide-react";

import { FollowUpSection } from "@/components/follow-up-section";
import { PaywallGate } from "@/components/paywall/paywall-gate";
import { ShareButton } from "@/components/share-button";
import { createClient } from "@/lib/supabase/server";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { isBookmarked } from "@/actions/bookmark";
import { BookmarkButton } from "@/components/bookmark-button";
import BackButton from "@/components/back-button";
import { DetoxCard } from "@/components/recipe/DetoxCard";
import Comment from "@/components/recipe/Comment";
import AccordionSection from "@/components/recipe/AccordionSection";
import LikeButton from "@/components/recipe/LikeButton";
import { logRecipeView } from "@/actions/activity";
import { isLiked } from "@/actions/likes";

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
    .select("*, follow_up_questions")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data;
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
      images: [{ url: recipe.image_url! }],
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
  `
      )
      .eq("recipe_id", recipe.id)
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
          (like: { user_id: string }) => like.user_id === user?.id
        ) ?? false,
    }
  : null;

  const ingredients =
    (recipe.ingredients as Array<{ emoji: string; label: string }>) ?? [];

  const howToMake =
    (recipe.how_to_make as Array<{ step: string; instruction: string }>) ?? [];

  const heroImageUrl = recipe.image_url
    ? getCloudinaryUrl(recipe.image_url, { width: 900, height: 506 })
    : undefined;

  return (
    <PaywallGate>
      <div className="min-h-screen bg-background">
        {/* Sub-header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <BackButton className="p-3 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <div className="flex items-center gap-2">
            <ShareButton
              recipeId={recipe.id}
              recipeTitle={recipe.title}
              addText=""
              text=""
            />
            <BookmarkButton
              recipeId={recipe.id}
              initialBookmarked={bookmarked}
              isAuthenticated={!!user}
              text=""
              addText=""
              popularStyle=""
            />
          </div>
        </div>

        <main className="pb-6">
          {/* Hero image — LCP element, load eagerly */}
          <div className="mx-4 rounded-4xl overflow-hidden bg-muted mb-8 relative aspect-video">
            {heroImageUrl && (
              <Image
                src={heroImageUrl}
                alt={recipe.title}
                fill
                // Full width minus mx-4 (16px each side)
                sizes="calc(100vw - 32px)"
                className="object-cover"
                priority
              />
            )}
          </div>

          {/* Title + description */}
          <div className="px-4 mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1.5 leading-tight">
              {recipe.title}
            </h1>
            <p className="text-base font-medium text-[#57605E] leading-relaxed">
              {recipe.short_description}
            </p>
          </div>

          <div className="px-4 mb-8">
            <DetoxCard detoxPercent={91} hydrationPercent={2} />
          </div>

          {/* Accordion sections */}
          <div className="px-4 space-y-3">
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
                savedQuestions={recipe.follow_up_questions}
              />
            </div>

            <div className="flex justify-between items-center mt-8">
              <div className="flex items-center gap-2">
                <p className="text-[#727E7A] text-sm">Was this helpful?</p>
                <LikeButton
                  recipeId={recipe.id}
                  initialLiked={liked}
                  isAuthenticated={!!user}
                />
              </div>
              <p className="font-medium text-sm">
                {recipe.likes} people found this helpful
              </p>
            </div>

            <div className="flex justify-between items-center mt-8">
              <ShareButton
                recipeId={recipe.id}
                recipeTitle={recipe.title}
                text="Send this to a friend"
                addText="show"
              />
              <BookmarkButton
                recipeId={recipe.id}
                initialBookmarked={bookmarked}
                isAuthenticated={!!user}
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
    </PaywallGate>
  );
}
