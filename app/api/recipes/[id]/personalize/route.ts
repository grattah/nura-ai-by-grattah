import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import {
  computeMultipliers,
  describeModifiers,
} from "@/lib/health-profile/nutrition-modifiers";
import {
  computeNutritionFinal,
  type NutritionPoints,
} from "@/lib/scoring/nutrition";
import {
  detectInteractionIngredients,
  type InteractionIngredient,
} from "@/lib/interactions/detect";
import { resolveMedications } from "@/lib/interactions/rxclass";
import type { Bucket } from "@/lib/interactions/buckets";
import { detectAllergens } from "@/lib/interactions/allergens";

export const maxDuration = 60;

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
      "id, title, ingredients, track, final_score, ingredient_score, interaction_ingredients, nutrition_positive_total, nutrition_added_sugar_points, nutrition_sat_fat_points, nutrition_sodium_points, nutrition_fiber_points, nutrition_protein_points",
    )
    .eq("id", id)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    title: string;
    ingredients: unknown;
    track: "Beverage" | "Solid Food" | null;
    final_score: number | null;
    ingredient_score: number | null;
    interaction_ingredients: InteractionIngredient[] | null;
    nutrition_positive_total: number | null;
    nutrition_added_sugar_points: number | null;
    nutrition_sat_fat_points: number | null;
    nutrition_sodium_points: number | null;
    nutrition_fiber_points: number | null;
    nutrition_protein_points: number | null;
  } | null;

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Base score + its per-factor points must exist first (the lazy base-scoring
  // trigger computes/backfills them).
  if (recipe.final_score == null || recipe.nutrition_positive_total == null) {
    return NextResponse.json({ notReady: true });
  }

  if (!(await hasActiveSubscription(admin, user.id))) {
    return NextResponse.json(
      { error: "Subscription required" },
      { status: 403 },
    );
  }

  const { data: profileRaw } = await admin
    .from("health_profiles")
    .select(
      "updated_at, conditions, goals, allergies, allergies_other, medications",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = profileRaw as unknown as {
    updated_at: string;
    conditions: string[];
    goals: string[];
    allergies: string[];
    allergies_other: string | null;
    medications: { name: string; rxcui: string | null }[];
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
    const points: NutritionPoints = {
      positiveTotal: recipe.nutrition_positive_total ?? 0,
      addedSugarPoints: recipe.nutrition_added_sugar_points ?? 0,
      saturatedFatPoints: recipe.nutrition_sat_fat_points ?? 0,
      sodiumPoints: recipe.nutrition_sodium_points ?? 0,
      fiberPoints: recipe.nutrition_fiber_points ?? 0,
      proteinPoints: recipe.nutrition_protein_points ?? 0,
      track: recipe.track ?? "Solid Food",
      ingredientScore: recipe.ingredient_score ?? 0,
    };

    const multipliers = computeMultipliers(
      profile.conditions ?? [],
      profile.goals ?? [],
    );
    const applied = describeModifiers(multipliers);
    const personalizedFinal = computeNutritionFinal(points, multipliers);

    let interaction = recipe.interaction_ingredients ?? [];
    if (!interaction.length) {
      interaction = await detectInteractionIngredients(
        admin,
        recipe.ingredients,
      );
      await admin
        .from("recipes")
        .update({ interaction_ingredients: interaction } as never)
        .eq("id", recipe.id);
    }
    const resolvedMeds = await resolveMedications(
      admin,
      profile.medications ?? [],
    );

    // Allergy alerts — deterministic (recipe ingredients × the user's allergens).
    const allergyAlerts = detectAllergens(
      recipe.ingredients,
      profile.allergies ?? [],
      profile.allergies_other ?? "",
      (profile.conditions ?? []).includes("celiac-disease"),
    );
    // Medication alerts — name the specific drug(s) whose class matches the
    // ingredient's mechanism bucket.
    const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const medicationAlerts = interaction
      .map((ii) => {
        const drugs = resolvedMeds
          .filter((m) => m.buckets.includes(ii.bucket as Bucket))
          .map((m) => m.name)
          .filter(Boolean);
        if (!drugs.length) return null;
        return {
          type: "medication" as const,
          severity: ii.severity,
          label: "Medication",
          message: `${cap(ii.ingredient_key)} may interact with medications you're taking (${drugs.join(", ")}).`,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
    const safetyAlerts = [...allergyAlerts, ...medicationAlerts];

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

    return NextResponse.json({ personalized: true });
  } catch (err) {
    console.error("[recipes/personalize]", err);
    return NextResponse.json(
      { error: "Failed to personalize" },
      { status: 500 },
    );
  }
}
