import Link from "next/link";
import { ChevronLeft, ChevronRight, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookmarkedRecipe {
  bookmark_id: string;
  recipe_id: string;
  title: string;
  image_url: string | null;
  preview_ingredients: string[];
  bookmarked_at: string;
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
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
        >
          <Link href="/">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-foreground">Bookmarks</h1>
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
      <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card hover:opacity-90 active:scale-[0.98] transition-all duration-150 py-0">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 p-4">
            {/* Thumbnail */}
            <div className="w-20 h-20 rounded-2xl bg-muted shrink-0 overflow-hidden">
              {bookmark.image_url ? (
                <img
                  src={bookmark.image_url}
                  alt={bookmark.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Bookmark className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground leading-snug mb-2">
                {bookmark.title}
              </p>
              <ul className="space-y-0.5">
                {bookmark.preview_ingredients.slice(0, 3).map((ing, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyBookmarks() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
      >
        <Bookmark className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-base font-semibold text-foreground mb-1">
        No bookmarks yet
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        Tap the bookmark icon on any recipe to save it here.
      </p>
      <Button
        asChild
        variant="secondary"
        className="rounded-full px-6 min-h-11 text-sm font-semibold bg-card text-foreground border-0 shadow-none"
      >
        <Link href="/recipes">Browse Recipes</Link>
      </Button>
    </div>
  );
}
