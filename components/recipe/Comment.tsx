"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import CommentForm from "./CommentForm";
import { formatRelativeTime } from "@/lib/utils";
import profile from "@/public/profile.png";
import CommentLikeButton from "./CommentLikeButton";
import { createClient } from "@/lib/supabase/client";

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
  const[isSubscriber, setIsSubscriber] = React.useState(false);


  React.useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
        if (data?.status === "active") {
          setIsSubscriber(true);
        }
    };
    run();
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#111312]">Comments</h2>
        <Link
          href={seeAllHref}
          className="text-mint-green underline font-semibold"
        >
          See comments
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-5 flex flex-col gap-5">
        {isSubscriber && latestComment && (
          <div className="flex items-start gap-3">
            <div className="relative size-12 rounded-full overflow-hidden shrink-0">
              {latestComment && (
                <Image
                  src={latestComment.profiles.avatar_url || profile}
                  alt={`${latestComment.profiles.username}'s avatar`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="font-semibold text-[#1B1D1D] font-redHatDisplay lowercase">
                @{latestComment?.profiles?.username || "unknown"}
              </p>
              <p className="text-[#57605E] leading-relaxed">
                {latestComment?.content || ""}
              </p>

              <div className="flex items-center gap-8 mt-2">
                <span className="text-sm text-[#727E7A] font-medium">
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
