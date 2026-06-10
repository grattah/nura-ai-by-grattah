"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

interface Comment {
  id: string;
  username: string;
  avatarUrl: string;
  content: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
}

interface CommentsSectionProps {
  total: number;
  latestComment: Comment;
  seeAllHref?: string;
}

export default function Comment({
  total,
  latestComment,
  seeAllHref = "#",
}: CommentsSectionProps) {

  function onReply(id: string) {
    // Placeholder for reply action
    console.log(`Reply to comment ${id}`);
  }

  function onLike(id: string) {
	// Placeholder for like action
	console.log(`Like comment ${id}`);
  } 

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#111312]">
          Comments ({total})
        </h2>
        <Link
          href={seeAllHref}
          className="text-[#227B6F] underline font-semibold text-base"
        >
          See all
        </Link>
      </div>

      <div className="rounded-2xl bg-[#FFFFFF] p-5 flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
            <Image
              src={latestComment.avatarUrl}
              alt={`${latestComment.username}'s avatar`}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <p className="font-semibold text-[#1B1D1D] text-base">
              @{latestComment.username}
            </p>
            <p className="text-[#57605E] leading-relaxed text-base">
              {latestComment.content}
            </p>

            <div className="flex items-center gap-8 mt-2">
              <span className="text-sm text-[#727E7A] font-medium">
                {latestComment.timestamp}
              </span>

              <button
                onClick={() => onReply(latestComment.id)}
                className="text-sm text-[#727E7A] font-medium hover:text-[#1A1A1A] transition-colors"
              >
                Reply
              </button>

              <button
                onClick={() => onLike(latestComment.id)}
                className="flex items-center gap-1.5 text-sm text-[#57605E] hover:text-[#1A1A1A] transition-colors"
                aria-label={`Like comment. Currently ${latestComment.likes} likes`}
              >
                <Heart
                  size={18}
                  className={
                    latestComment.hasLiked
                      ? "fill-[#E11D48] text-[#E11D48]"
                      : ""
                  }
                />
                <span>{latestComment.likes}</span>
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => onReply(latestComment.id)}
          className="w-full text-left rounded-full bg-[#E8E6DC] px-5 py-4 text-[#57605E] hover:bg-[#D8D6CC] transition-colors text-sm"
        >
          Add a Comment...
        </button>
      </div>
    </section>
  );
}
