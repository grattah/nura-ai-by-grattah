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
        "flex items-center justify-center rounded-full transition-all hover:opacity-70 disabled:opacity-50",
        !showText && !popular && "bg-[#E8E6DC] p-3 max-xs:p-2 text-subtle",
        showText &&
          "border border-[#C4CAC8] bg-transparent p-3 max-xs:p-2 text-subtle w-full",
        popular && "bg-white p-2",
      )}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
    >
      <Bookmark
        strokeWidth={2.5}
        size={16}
        className={cn(
          "transition-all max-xs:size-2.5",
          bookmarked && "fill-mint-green text-mint-green",
          popular && "text-mint-green",
        )}
      />
      {showText && (
        <span className="ml-1 font-medium text-sm max-xs:text-xs max-2xs:text-[10px] text-[#727E7A] text-nowrap">
          {text}
        </span>
      )}
    </button>
  );
}
