"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/actions/bookmark";

interface BookmarkButtonProps {
  recipeId: string;
  initialBookmarked: boolean;
  isAuthenticated: boolean;
  text: string;
  addText: string;
}

export function BookmarkButton({
  recipeId,
  initialBookmarked,
  isAuthenticated,
  text,
  addText,
}: BookmarkButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  const showText = addText === "show";

  const handleToggle = () => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    // Optimistic update
    setBookmarked((prev) => !prev);

    startTransition(async () => {
      const result = await toggleBookmark(recipeId);
      // Revert if the server action failed
      if (result.error) {
        setBookmarked((prev) => !prev);
        toast({
          title: "Error",
          description: "Failed to update bookmark. Please try again.",
          variant: "destructive",
        });
      } else {
        setBookmarked(result.bookmarked);
        toast({
          title: result.bookmarked
            ? "Added to bookmarks"
            : "Removed from bookmarks",
          description: result.bookmarked
            ? "You can find this recipe in your bookmarks."
            : "This recipe has been removed from your bookmarks.",
        });
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`rounded-full text-[#57605E] hover:opacity-70 transition-opacity disabled:opacity-50 flex items-center ${
        showText ? "border border-[#C4CAC8] bg-inherit px-4 py-3" : "bg-[#E8E6DC] p-3"
      }`}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
    >
      <Bookmark
        strokeWidth={2.5}
        size={16}
        className={cn("transition-all", bookmarked && "fill-foreground")}
      />
      {showText && (
        <span className="ml-2 font-medium text-xs text-[#727E7A]">{text}</span>
      )}
    </button>
  );
}
