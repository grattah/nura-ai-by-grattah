import React from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BsSliders } from "react-icons/bs";

import { createClient } from "@/lib/supabase/server";
import profile from "@/public/profile.png";
import BackButton from "@/components/back-button";
import CommentsSection from "@/components/recipe/CommentsSection";
import { RecipePaywallGate } from "@/components/recipe/RecipePaywallGate";

interface PageProps {
  searchParams: Promise<{ recipeId?: string; limit?: string }>;
}

const page = async ({ searchParams }: PageProps) => {
  const { recipeId, limit: limitParam } = await searchParams;

  if (!recipeId) return notFound();

  const limit = Math.min(Math.max(parseInt(limitParam ?? "5", 5) || 5, 5), 200);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  const [
    { data: recipe },
    { data: comments, count: totalCount },
    subResult,
  ] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", recipeId).maybeSingle(),
    supabase
      .from("comments")
      .select(
        `
    id,
    content,
    created_at,
    parent_id,
	likes,
    profiles (id, username, avatar_url),
	comment_likes!comment_id (user_id),
    replies:comments!parent_id (
      id,
      content,
	  likes,
      created_at,
      profiles (id, username, avatar_url)
    )
  `,
        { count: "exact" }
      )
      .eq("recipe_id", recipeId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(limit),
      userId
      ? supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isSubscribed = subResult.data?.status === "active";

  if (!recipe) return;

  const hasLikedComment = (comment: any) =>
    comment.comment_likes?.some((like: any) => like.user_id === userId) ??
    false;

  const hasMore = (totalCount ?? 0) > (comments?.length ?? 0);

  return (
    <div className="bg-background">
      <main>
        <div className="flex items-center justify-between px-6 py-3.25 relative">
          <BackButton className="rounded-full bg-[#E8E6DC] p-3 absolute left-6" />
          <div className="flex flex-col gap-1 items-center w-full">
            <p className="font-semibold text-xl">Comments</p>
            <p className="font-medium text-[#57605E] text-sm">{recipe.title}</p>
          </div>
          <div />
        </div>

        <div className="w-full h-22 relative overflow-hidden">
          <Image
            src={recipe.image_url || ""}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        <div className="px-6 pt-6 bg-[#FFFFFF]">
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold text-base-text">
              All comments({totalCount})
            </p>
            <button className="flex gap-2 items-center">
              <BsSliders color="#227B6F" size={14} />
              <span className="text-base-text text-sm font-medium">Newest</span>
            </button>
          </div>
        </div>

        <CommentsSection
          comments={(comments ?? []).map((comment) => ({
            ...comment,
            hasLiked: hasLikedComment(comment),
            replies: (comment.replies ? [comment.replies].flat() : []).map(
              (reply: any) => ({
                ...reply,
                hasLiked: hasLikedComment(reply),
              })
            ),
          }))}
          recipeId={recipeId}
          userAvatar={user?.user_metadata?.avatar_url || profile}
          userEmail={user?.email}
          hasMore={hasMore}
          limit={limit}
          isAuthenticated={!!user}
        />
      </main>
      {!isSubscribed && <RecipePaywallGate />}
      
    </div>
  );
};

export default page;
