import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { meter } from "@/lib/credits-server";
import {
  computeMultipliers,
  describeModifiers,
} from "@/lib/health-profile/nutrition-modifiers";
import {
  classifyForPersonalization,
  computePersonalizedFinal,
} from "@/lib/scoring/personalize";

export const maxDuration = 60;

/**
 * Generates (or returns) the current user's Personalized Nutrition Score + safety
 * alerts for a recipe. Triggered by the detail page on first view for a
 * subscriber with a health profile. Cached per (user, recipe); regenerated only
 * when the health profile is newer than the cached score. Metered to the user.
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

  // Recipe base data (bioactivity not needed for the nutrition personalization).
  const { data: recipeRaw } = await admin
    .from("recipes")
    .select(
      "id, title, ingredients, nutrition, track, preparation, final_score, ingredient_score",
    )
    .eq("id", id)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    title: string;
    ingredients: unknown;
    nutrition: unknown;
    track: "Beverage" | "Solid Food" | null;
    preparation: "Juiced" | "Blended" | "N/A" | null;
    final_score: number | null;
    ingredient_score: number | null;
  } | null;

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Base nutrition score must exist first (the lazy base-scoring trigger runs it).
  if (recipe.final_score == null) {
    return NextResponse.json({ notReady: true });
  }

  if (!(await hasActiveSubscription(admin, user.id))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const { data: profileRaw } = await admin
    .from("health_profiles")
    .select("updated_at, conditions, goals, allergies, allergies_other, medications")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = profileRaw as unknown as {
    updated_at: string;
    conditions: string[];
    goals: string[];
    allergies: string[];
    allergies_other: string | null;
    medications: string[];
  } | null;
  if (!profile) {
    return NextResponse.json({ error: "No health profile" }, { status: 403 });
  }

  // Idempotency / staleness: reuse the cache unless the profile is newer or the
  // recipe's base score changed.
  const { data: cacheRaw } = await admin
    .from("recipe_personalized_scores" as never)
    .select("profile_updated_at, base_final_score")
    .eq("user_id" as never, user.id as never)
    .eq("recipe_id" as never, recipe.id as never)
    .maybeSingle();
  const cache = cacheRaw as unknown as {
    profile_updated_at: string;
    base_final_score: number | null;
  } | null;
  const fresh =
    cache &&
    cache.base_final_score === recipe.final_score &&
    new Date(cache.profile_updated_at) >= new Date(profile.updated_at);
  if (fresh) {
    return NextResponse.json({ personalized: true });
  }

  try {
    const classified = await classifyForPersonalization(
      {
        title: recipe.title,
        ingredients: recipe.ingredients,
        nutrition: recipe.nutrition,
        track: recipe.track,
        preparation: recipe.preparation,
      },
      {
        allergies: profile.allergies ?? [],
        allergiesOther: profile.allergies_other ?? "",
        medications: profile.medications ?? [],
        celiac: (profile.conditions ?? []).includes("celiac-disease"),
      },
    );

    const multipliers = computeMultipliers(
      profile.conditions ?? [],
      profile.goals ?? [],
    );
    const applied = describeModifiers(multipliers);
    const personalizedFinal = computePersonalizedFinal(
      classified,
      recipe.track,
      recipe.ingredient_score ?? 0,
      multipliers,
    );

    const safetyAlerts = classified.safetyAlerts.map((a) => ({
      type: a.type,
      label: a.type === "allergy" ? "Allergy" : "Medication",
      message: a.message,
    }));

    const { error: upErr } = await admin
      .from("recipe_personalized_scores" as never)
      .upsert(
        {
          user_id: user.id,
          recipe_id: recipe.id,
          base_final_score: recipe.final_score,
          personalized_final_score: personalizedFinal,
          adjusted: applied.length > 0,
          safety_alerts: safetyAlerts,
          applied_modifiers: applied,
          profile_updated_at: profile.updated_at,
        } as never,
        { onConflict: "user_id,recipe_id" },
      );
    if (upErr) throw upErr;

    await meter(user.id, classified.totalTokens, "recipe-personalize");

    return NextResponse.json({ personalized: true });
  } catch (err) {
    console.error("[recipes/personalize]", err);
    return NextResponse.json({ error: "Failed to personalize" }, { status: 500 });
  }
}
