import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Invalidate recipe-detail pages after an out-of-band re-score (e.g.
// scripts/usda-build.ts), so they reflect new scores immediately instead of
// waiting out the getCachedApprovedRecipe unstable_cache window. Secret-
// protected; service/admin callers only.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { recipeIds?: unknown };
  const ids = Array.isArray(body.recipeIds)
    ? body.recipeIds.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length) {
    for (const id of ids) revalidatePath(`/recipes/${id}`);
  } else {
    // No ids → revalidate every recipe detail page.
    revalidatePath("/recipes/[id]", "page");
  }
  return NextResponse.json({ revalidated: ids.length || "all" });
}
