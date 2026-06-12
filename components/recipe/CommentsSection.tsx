// components/recipe/CommentsSection.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import CommentCard from "@/components/recipe/CommentCard";
import CommentForm from "@/components/recipe/CommentForm";
import profile from "@/public/profile.png";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes: number;
  hasLiked: boolean;
  profiles: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  replies?: Comment[];
}

interface CommentsSectionProps {
  comments: Comment[];
  recipeId: string;
  userAvatar?: string;
  userEmail?: string;
  limit: number;
  hasMore: boolean;
  isAuthenticated: boolean;
}

export interface ReplyTarget {
  parentId: string;
  username: string;
}

export default function CommentsSection({
  comments,
  recipeId,
  userAvatar,
  userEmail,
  limit,
  hasMore,
  isAuthenticated,
}: CommentsSectionProps) {
  const [replyingTo, setReplyingTo] = React.useState<ReplyTarget | null>(null);

  return (
    <>
      <div className="mt-7.75 px-4 flex flex-col gap-4">
        {comments.map((comment) => (
          <CommentCard
            recipeId={recipeId}
            key={comment.id}
            comment={comment}
            replies={comment.replies ?? []}
            isAuthenticated={isAuthenticated}
            onStartReply={(parentId, username) =>
              setReplyingTo({ parentId, username })
            }
          />
        ))}
      </div>

      {(hasMore || limit > 5) && (
        <div className="px-4 mt-8 flex flex-col gap-3">
          {hasMore && (
            <Link
              href={`?recipeId=${recipeId}&limit=200`}
              scroll={false}
              className="block w-full text-center border border-[#C4CAC8] rounded-full py-4 text-[#227B6F] font-semibold text-sm hover:bg-[#C4CAC8]/5 transition-colors"
            >
              Load more comments
            </Link>
          )}

          {limit > 5 && (
            <Link
              href={`?recipeId=${recipeId}`}
              className="block w-full text-center border border-[#C4CAC8] rounded-full py-4 text-[#227B6F] font-semibold text-sm hover:bg-[#C4CAC8]/5 transition-colors"
            >
              Hide comments
            </Link>
          )}
        </div>
      )}

      <div className="px-4 mt-10 sticky bottom-2 bg-background pt-4 flex gap-2">
        {userAvatar && (
          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
            <Image
              src={userAvatar || profile}
              alt={userEmail ?? "user avatar"}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </div>
        )}
        <CommentForm
          recipeId={recipeId}
          variant="full"
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </>
  );
}
