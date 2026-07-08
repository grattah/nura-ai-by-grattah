import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Bookmark } from "lucide-react";

import { withTiming } from "@/lib/perf";
import { fetchBookmarksPage } from "@/lib/bookmark-fetch";
import { BookmarksList } from "@/components/bookmarks/BookmarkList";
import { SignInModalGate } from "@/components/SignInModalGate";

export default async function BookmarksPage() {
  const supabase = await createClient();
  let showSignInModal = false;

  const { data, error } = await withTiming("bookmarks:getClaims", () =>
    supabase.auth.getClaims(),
  );
  // Guests: show the empty shell behind the sign-in overlay (no user to fetch for).
  if (error || !data?.claims) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
          <h1 className="text-2xl font-semibold text-[#111312]">
            Saved Recipes
          </h1>
        </div>
        <main className="px-6 pb-10">
          <EmptyBookmarks />
        </main>
      </div>
    );
  }

  const userId = data?.claims?.sub;

  const initialBookmarks = userId
    ? await withTiming("bookmarks:getBookmarks", () =>
        fetchBookmarksPage(supabase, userId, 0),
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
        <h1 className="text-2xl font-semibold text-[#111312]">Saved Recipes</h1>
      </div>

      <main className="px-6 pb-10">
        {initialBookmarks.length > 0 ? (
          <BookmarksList initialBookmarks={initialBookmarks} userId={userId || ""} />
        ) : (
          <EmptyBookmarks />
        )}
      </main>

      {showSignInModal && <SignInModalGate />}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyBookmarks() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "#227B6F" }}
      >
        <Bookmark color="#FFFFFF" className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">
        No saved recipes yet
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Tap the bookmark icon on any recipe to save it here.
      </p>
      <Link
        href="/popular"
        className="rounded-full px-6 py-4 text-sm font-semibold bg-[#227B6F] text-[#FFFFFF] hover:opacity-90 transition-opacity"
      >
        Browse Recipes
      </Link>
    </div>
  );
}
