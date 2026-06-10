"use client";

import React, { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { FaHeart } from "react-icons/fa";
import { useRouter } from "next/navigation";

import { useToast } from "@/hooks/use-toast";
import { toggleLike } from "@/actions/likes";

interface LikeButtonProps {
  recipeId: string;
  initialLiked: boolean;
  isAuthenticated: boolean;
}

const LikeButton = ({
  recipeId,
  initialLiked,
  isAuthenticated,
}: LikeButtonProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    const wasLiked = liked;
    setLiked(!wasLiked);

    startTransition(async () => {
      const result = await toggleLike(recipeId);

      if (result.error) {
        setLiked(wasLiked);
        toast({
          title: "Error",
          description: "Failed to update like. Please try again.",
          variant: "destructive",
        });
      } else {
        setLiked(result.liked);
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      aria-label={liked ? "Unlike recipe" : "Like recipe"}
      className="p-2 rounded-full bg-[#E8E6DC] disabled:opacity-50 hover:opacity-70 transition-opacity"
    >
      {liked ? (
        <FaHeart size={16} color="#227B6F" />
      ) : (
        <Heart size={16} color="#227B6F" strokeWidth={1.5} />
      )}
    </button>
  );
};

export default LikeButton;