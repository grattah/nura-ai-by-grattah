import Link from "next/link";
import { Bookmark, Clock } from "lucide-react";
import { FaBookmark, FaHeart } from "react-icons/fa";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";

import { truncateText } from "@/lib/truncate-text";
import { formatRelativeTime } from "@/lib/format-time";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkedRecipe {
  bookmark_id: string;
  recipe_id: string;
  title: string;
  description: string;
  image_url: string | null;
  preview_ingredients: string[];
  bookmarked_at: string;
  likes: number;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getBookmarks(): Promise<BookmarkedRecipe[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
      id,
      created_at,
      recipes (
        id,
        title,
        short_description,
        image_url,
        preview_ingredients
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((b) => b.recipes)
    .map((b) => ({
      bookmark_id: b.id,
      recipe_id: (b.recipes as any).id,
      title: (b.recipes as any).title,
      description: (b.recipes as any).short_description,
      likes: (b.recipes as any).likes,
      image_url: (b.recipes as any).image_url,
      preview_ingredients: (b.recipes as any).preview_ingredients ?? [],
      category_slug: (b.recipes as any).category_slug,
      bookmarked_at: b.created_at,
    }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BookmarksPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const bookmarks = await getBookmarks();

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-header */}
      <div className="px-8 py-4.75 mb-5 bg-[#F3F1E8] shadow-[0px_4px_20px_0px_#01261F0A]">
        <h1 className="text-2xl font-semibold text-[#111312]">Saved Recipes</h1>
      </div>

      <main className="px-4 pb-10">
        {bookmarks.length > 0 ? (
          <div className="grid gap-4">
            {bookmarks.map((b) => (
              <BookmarkCard key={b.bookmark_id} bookmark={b} />
            ))}
          </div>
        ) : (
          <EmptyBookmarks />
        )}
      </main>
    </div>
  );
}

// ─── BookmarkCard ─────────────────────────────────────────────────────────────

function BookmarkCard({ bookmark }: { bookmark: BookmarkedRecipe }) {
  const href = `/recipes/${bookmark.recipe_id}`;

  return (
    <Link href={href}>
      <div className="border-b border-[#E2E4E4] pb-4 overflow-hidden">
        <div className="p-0">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-2xl bg-muted shrink-0 overflow-hidden">
              {bookmark.image_url ? (
                <Image
                  src={bookmark.image_url}
                  alt={bookmark.title}
                  className="w-full h-full object-cover"
                  width={80}
                  height={80}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bookmark className="size-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-base font-medium text-foreground leading-snug">
                  {bookmark.title}
                </p>
                <p className="text-sm text-[#57605E]">
                  {truncateText(bookmark.description)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock size={16} color="#9CA5A3" />
                  <p className="text-[#57605E] text-sm font-medium">
                    {formatRelativeTime(bookmark.bookmarked_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <FaHeart size={16} color="#227B6F" />
                  <p className="text-[#227B6F] text-sm font-medium">
                    {bookmark.likes}
                  </p>
                </div>
              </div>
            </div>

            <div className="size-10 flex items-center justify-center rounded-full bg-[#E3E8DF] shrink-0 ml-auto">
              <FaBookmark color="#227B6F" size={20} className="w-3 h-5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
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
        href="/recipes"
        className="rounded-full px-6 py-4 text-sm font-semibold bg-[#227B6F] text-[#FFFFFF] hover:opacity-90 transition-opacity"
      >
        Browse Recipes
      </Link>
    </div>
  );
}
