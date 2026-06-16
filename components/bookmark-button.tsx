"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookmark } from "@/components/bookmark-provider";

interface BookmarkButtonProps {
  text: string;
  addText: string;
  popularStyle: string;
}

export function BookmarkButton({
  text,
  addText,
  popularStyle,
}: BookmarkButtonProps) {
  const { bookmarked, isPending, toggle } = useBookmark();
  const showText = addText === "show";
  const popular = popularStyle === "yes";

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={cn(
        "flex items-center justify-center rounded-full transition-all hover:opacity-70 disabled:opacity-50 w-full",
        !showText && !popular && "bg-[#E8E6DC] p-3 text-[#57605E]",
        showText &&
          "border border-[#C4CAC8] bg-transparent p-3 text-[#57605E]",
        popular && "bg-white p-2"
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
    >
      <Bookmark
        strokeWidth={2.5}
        size={16}
        className={cn(
          "transition-all",
          bookmarked && "fill-[#227B6F] text-[#227B6F]",
          popular && "text-[#227B6F]"
        )}
      />
      {showText && (
        <span className="ml-1 font-medium text-sm max-[385px]:text-xs max-[330px]:text-[10px] text-[#727E7A] text-nowrap">
          {text}
        </span>
      )}
    </button>
  );
}