"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import CommentForm from "./CommentForm";
import { formatRelativeTime } from "@/lib/utils";
import profile from "@/public/profile.png";
import CommentLikeButton from "./CommentLikeButton";

interface Comment {
  id: string;
  hasLiked: boolean;
  likes: number;
  profiles: Profile;
  content: string;
  created_at: string;
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface CommentsSectionProps {
  total: number | undefined;
  latestComment: Comment | null;
  seeAllHref?: string;
  recipeId: string;
  isAuthenticated: boolean;
}

export default function Comment({
  total,
  latestComment,
  seeAllHref = "#",
  recipeId,
  isAuthenticated,
}: CommentsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base max-xs:text-sm font-semibold text-[#111312]">
          Comments ({total})
        </h2>
        <Link
          href={seeAllHref}
          className="text-mint-green max-xs:text-xs underline font-semibold"
        >
          See all
        </Link>
      </div>

      <div className="rounded-2xl max-xs:rounded-lg bg-white p-5 max-xs:p-4 flex flex-col gap-5 max-xs:gap-4">
        {latestComment && (
          <div className="flex items-start gap-3">
            <div className="relative size-12 max-xs:size-9 rounded-full overflow-hidden shrink-0">
              {latestComment && (
                <Image
                  src={latestComment.profiles.avatar_url || profile}
                  alt={`${latestComment.profiles.username}'s avatar`}
                  fill
                  className="object-cover max-xs:size-9"
                  sizes="48px"
                />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="font-semibold max-xs:text-sm text-[#1B1D1D] font-redHatDisplay lowercase">
                @{latestComment?.profiles?.username || "unknown"}
              </p>
              <p className="text-[#57605E] max-xs:text-sm leading-relaxed">
                {latestComment?.content || ""}
              </p>

              <div className="flex items-center gap-8 max-xs:gap-5 mt-2">
                <span className="text-sm max-xs:text-xs text-[#727E7A] font-medium">
                  {latestComment &&
                    formatRelativeTime(latestComment.created_at)}
                </span>

                <CommentLikeButton
                  commentId={latestComment?.id || ""}
                  recipeId={recipeId}
                  initialLiked={latestComment?.hasLiked ?? false}
                  initialCount={latestComment?.likes ?? 0}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            </div>
          </div>
        )}
        <CommentForm recipeId={recipeId} />
      </div>
    </section>
  );
}
