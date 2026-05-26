"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/actions/bookmark";

interface BookmarkButtonProps {
  recipeId: string;
  initialBookmarked: boolean;
  isAuthenticated: boolean;
}

export function BookmarkButton({
  recipeId,
  initialBookmarked,
  isAuthenticated,
}: BookmarkButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

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
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isPending}
      className="w-11 h-11 text-foreground hover:opacity-70 transition-opacity disabled:opacity-50"
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark recipe"}
    >
      <Bookmark
        className={cn(
          "w-5 h-5 transition-all",
          bookmarked && "fill-foreground",
        )}
      />
    </Button>
  );
}
