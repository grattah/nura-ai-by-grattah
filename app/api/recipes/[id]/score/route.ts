import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { recordUsage } from "@/lib/usage-server";
import { scoreBioactivities } from "@/lib/scoring/bioactivity";
import { writeBioactivityAndCategories } from "@/lib/scoring/persist";
import {
  scoreNutritionFromDb,
  writeNutritionV2,
} from "@/lib/scoring/nutrition-deterministic";

export const maxDuration = 60;

/** Scores an unscored recipe on first view. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const {
    data: { user },
  } = await getCachedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: recipeRaw } = await admin
    .from("recipes" as never)
    .select(
      "id, title, short_description, ingredients, how_to_make, why_it_works, nutrition, servings, final_score_10, created_by, recipe_tags(recipe_id)",
    )
    .eq("id" as never, id as never)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    title: string;
    short_description: string | null;
    ingredients: unknown;
    how_to_make: unknown;
    why_it_works: string | null;
    nutrition: unknown;
    servings: number | null;
    final_score_10: number | null;
    created_by: string | null;
    recipe_tags: { recipe_id: string }[] | null;
  } | null;

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const needsBio = (recipe.recipe_tags?.length ?? 0) === 0;
  const needsNut = recipe.final_score_10 == null;
  if (!needsBio && !needsNut) {
    return NextResponse.json({ scored: true });
  }

  const isOwner = recipe.created_by === user.id;
  const isAdmin = isOwner ? false : !!(await getAdminIdentity());
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [bioRes, nutRes] = await Promise.allSettled([
    needsBio ? scoreBioactivities(recipe) : Promise.resolve(null),
    needsNut ? scoreNutritionFromDb(admin, recipe) : Promise.resolve(null),
  ]);

  try {
    if (bioRes.status === "fulfilled" && bioRes.value) {
      await writeBioactivityAndCategories(
        admin,
        recipe.id,
        bioRes.value.scoresBySlug,
      );
      if (isOwner) {
        void recordUsage({
          provider: "anthropic",
          model: "claude-haiku-4-5",
          surface: "recipe-score-bioactivity",
          billed: false,
          userId: user.id,
          totalTokens: bioRes.value.totalTokens,
        });
      } else {
        void recordUsage({
          provider: "anthropic",
          model: "claude-haiku-4-5",
          surface: "recipe-score-bioactivity",
          billed: false,
          userId: user.id,
          totalTokens: bioRes.value.totalTokens,
        });
      }
    } else if (bioRes.status === "rejected") {
      console.error("[recipes/score] bioactivity", bioRes.reason);
    }

    if (nutRes.status === "fulfilled" && nutRes.value) {
      await writeNutritionV2(admin, recipe.id, nutRes.value.patch);
    } else if (nutRes.status === "rejected") {
      console.error("[recipes/score] nutrition", nutRes.reason);
    }
  } catch (err) {
    console.error("[recipes/score] persist", err);
    return NextResponse.json({ error: "Failed to score" }, { status: 500 });
  }

  const scored =
    bioRes.status === "fulfilled" || nutRes.status === "fulfilled";
  if (!scored) {
    return NextResponse.json({ error: "Failed to score" }, { status: 500 });
  }
  return NextResponse.json({ scored: true });
}
