"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { toggleBookmark } from "@/actions/bookmark";

interface BookmarkContextValue {
  bookmarked: boolean;
  isPending: boolean;
  toggle: () => void;
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null);

export function BookmarkProvider({
  recipeId,
  initialBookmarked,
  isAuthenticated,
  children,
}: {
  recipeId: string;
  initialBookmarked: boolean;
  isAuthenticated: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const toggle = useCallback(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    setBookmarked((prev) => !prev);

    startTransition(async () => {
      const result = await toggleBookmark(recipeId);
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
  }, [isAuthenticated, recipeId, router, toast, startTransition]);

  const value = useMemo(
    () => ({ bookmarked, isPending, toggle }),
    [bookmarked, isPending, toggle],
  );

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmark() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) {
    throw new Error("useBookmark must be used within a BookmarkProvider");
  }
  return ctx;
}