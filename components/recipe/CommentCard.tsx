"use client";

import React from "react";
import Image from "next/image";
import { Heart } from "lucide-react";

import profile from "@/public/profile.png";
import { formatRelativeTime } from "@/lib/utils";
import CommentLikeButton from "./CommentLikeButton";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  likes: number;
  profiles: Profile | null;
  content: string;
  created_at: string;
  hasLiked: boolean;
}

interface CommentCardProps {
  comment: Comment;
  replies: Comment[];
  recipeId: string;
  isAuthenticated: boolean;
  onStartReply: (parentId: string, username: string) => void;
}

const CommentCard = ({
  comment,
  replies,
  recipeId,
  isAuthenticated,
  onStartReply,
}: CommentCardProps) => {
  const avatarSrc = comment.profiles?.avatar_url || profile;
  const username = comment.profiles?.username ?? "unknown";

  const [showReplies, setShowReplies] = React.useState(false);

  function toggleShowReplies() {
    setShowReplies(!showReplies);
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
          <Image
            src={avatarSrc}
            alt={`${username}'s avatar`}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="font-semibold text-[#1B1D1D] font-redHatDisplay lowercase">
            @{username}
          </p>
          <p className="text-[#57605E] leading-relaxed">{comment.content}</p>

          <div className="flex items-center gap-8 mt-2">
            <span className="text-sm text-[#727E7A] font-medium">
              {formatRelativeTime(comment.created_at)}
            </span>

            <button
              onClick={toggleShowReplies}
              className="text-sm text-[#727E7A] font-medium hover:text-[#1A1A1A] transition-colors"
            >
              {showReplies
                ? "Hide replies"
                : `${replies.length} ${
                    replies.length > 1 ? "replies" : "reply"
                  }`}
            </button>

            <CommentLikeButton
              commentId={comment.id}
              recipeId={recipeId}
              initialLiked={comment.hasLiked}
              initialCount={comment.likes ?? 0}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </div>
      {showReplies && (
        <div className="bg-[#F2F3F3] rounded-lg w-[83%] p-5 ml-auto mt-3">
          <div className="flex flex-col gap-3">
            {replies &&
              replies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                    <Image
                      src={reply.profiles?.avatar_url || profile}
                      alt={`${reply.profiles?.username}'s avatar`}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>

                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="font-semibold text-[#1B1D1D] font-redHatDisplay lowercase">
                      @{reply.profiles?.username}
                    </p>
                    <p className="text-[#57605E] leading-relaxed">
                      {reply.content}
                    </p>

                    <div className="flex items-center gap-8 mt-2">
                      <span className="text-sm text-[#727E7A] font-medium">
                        {formatRelativeTime(reply.created_at)}
                      </span>

                      <CommentLikeButton
                        commentId={reply.id}
                        recipeId={recipeId}
                        initialLiked={reply.hasLiked}
                        initialCount={reply.likes ?? 0}
                        isAuthenticated={isAuthenticated}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-sm text-mint-green font-semibold mt-5">
            Load more replies
          </p>
          <button
            onClick={() => onStartReply(comment.id, username)}
            className="border border-[#C4CAC8] rounded-full w-full py-4 text-mint-green text-sm font-semibold mt-5"
          >
            Add a reply
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentCard;
