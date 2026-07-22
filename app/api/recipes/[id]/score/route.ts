import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { meter } from "@/lib/credits-server";
import { scoreBioactivities } from "@/lib/scoring/bioactivity";
import { scoreNutrition } from "@/lib/scoring/nutrition";
import {
  writeBioactivityAndCategories,
  writeNutrition,
} from "@/lib/scoring/persist";

export const maxDuration = 60;

/**
 * Scores a recipe's bioactivities + categories + base nutrition, triggered by
 * the detail page on first view of an unscored recipe — the deferred completion
 * of a find-recipe generation (which no longer scores inline). Mirrors the lazy
 * hero-image route: awaited request (reliable on serverless), owner-or-admin
 * only, and the two sonnet passes are metered to the recipe's owner.
 */
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
    .from("recipes")
    .select(
      "id, title, short_description, ingredients, how_to_make, why_it_works, nutrition, final_score, nutrition_positive_total, created_by, recipe_tags(recipe_id)",
    )
    .eq("id", id)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    title: string;
    short_description: string | null;
    ingredients: unknown;
    how_to_make: unknown;
    why_it_works: string | null;
    nutrition: unknown;
    final_score: number | null;
    nutrition_positive_total: number | null;
    created_by: string | null;
    recipe_tags: { recipe_id: string }[] | null;
  } | null;

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // What still needs doing. Nutrition also re-runs when the per-factor points are
  // missing (backfill for recipes scored before those columns existed).
  const needsBio = (recipe.recipe_tags?.length ?? 0) === 0;
  const needsNut =
    recipe.final_score == null || recipe.nutrition_positive_total == null;
  if (!needsBio && !needsNut) {
    return NextResponse.json({ scored: true });
  }

  // Only the recipe's creator or an admin may trigger scoring (and be charged).
  const isOwner = recipe.created_by === user.id;
  const isAdmin = isOwner ? false : !!(await getAdminIdentity());
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run only the passes that are needed. Settle independently so one failing
  // doesn't discard the other's result.
  const [bioRes, nutRes] = await Promise.allSettled([
    needsBio ? scoreBioactivities(recipe) : Promise.resolve(null),
    needsNut ? scoreNutrition(recipe) : Promise.resolve(null),
  ]);

  try {
    if (bioRes.status === "fulfilled" && bioRes.value) {
      await writeBioactivityAndCategories(
        admin,
        recipe.id,
        bioRes.value.scoresBySlug,
        bioRes.value.overrides,
      );
      if (isOwner) {
        await meter(
          user.id,
          bioRes.value.totalTokens,
          "recipe-score-bioactivity",
          { provider: "anthropic", model: "claude-haiku-4-5" },
        );
      }
    } else if (bioRes.status === "rejected") {
      console.error("[recipes/score] bioactivity", bioRes.reason);
    }

    if (nutRes.status === "fulfilled" && nutRes.value) {
      await writeNutrition(admin, recipe.id, nutRes.value);
      if (isOwner) {
        await meter(user.id, nutRes.value.totalTokens, "recipe-score-nutrition", {
          provider: "anthropic",
          model: "claude-haiku-4-5",
        });
      }
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
