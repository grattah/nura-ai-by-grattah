"use client";

import React from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { toggleCommentLike } from "@/actions/like-comments";

interface CommentLikeButtonProps {
  commentId: string;
  recipeId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
}

export default function CommentLikeButton({
  commentId,
  recipeId,
  initialLiked,
  initialCount,
  isAuthenticated,
}: CommentLikeButtonProps) {
  const router = useRouter();
  const [liked, setLiked] = React.useState(initialLiked);
  const [count, setCount] = React.useState(initialCount);
  const [isPending, startTransition] = React.useTransition();

  const handleToggle = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((prev) => prev + (wasLiked ? -1 : 1));

    startTransition(async () => {
      const result = await toggleCommentLike(commentId, recipeId);
      if (result.error) {
        setLiked(wasLiked);
        setCount((prev) => prev + (wasLiked ? 1 : -1));
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-1.5 max-[340px]:text-xs text-sm text-[#57605E] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
      aria-label={liked ? "Unlike comment" : "Like comment"}
    >
      <Heart
        size={18}
        className={`${liked ? "fill-[#227B6F] text-[#227B6F]" : ""}`}
      />
      <span>{count}</span>
    </button>
  );
}