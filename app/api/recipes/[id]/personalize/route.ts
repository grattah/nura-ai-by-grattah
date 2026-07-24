import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { computeMatchScore } from "@/lib/scoring/match-score";
import {
  detectInteractionIngredients,
  type InteractionIngredient,
} from "@/lib/interactions/detect";
import { resolveMedications } from "@/lib/interactions/rxclass";
import type { Bucket } from "@/lib/interactions/buckets";
import { detectAllergens } from "@/lib/interactions/allergens";

export const maxDuration = 60;

// Computes the deterministic Recipe Match Score (PRD) for the signed-in user +
// this recipe, and the deterministic safety alerts (allergy / medication). This
// replaces the old nutrient-point "personalized" re-weighting. The route path is
// unchanged for the (separately owned) UI trigger.
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

  // `recipes` cast to `never` so we can select BNS-v2 columns not yet in the
  // (prod-generated) types.
  const { data: recipeRaw } = await admin
    .from("recipes" as never)
    .select(
      "id, title, ingredients, track, final_score_10, iron_rich, water_content_pct, sugar_points, salt_points, sat_fat_points, energy_points, fiber_points, protein_points, interaction_ingredients",
    )
    .eq("id" as never, id as never)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    title: string;
    ingredients: unknown;
    track: "Beverage" | "Solid Food" | null;
    final_score_10: number | null;
    iron_rich: boolean | null;
    water_content_pct: number | null;
    sugar_points: number | null;
    salt_points: number | null;
    sat_fat_points: number | null;
    energy_points: number | null;
    fiber_points: number | null;
    protein_points: number | null;
    interaction_ingredients: InteractionIngredient[] | null;
  } | null;

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Base Nutrition Score (with its point fields) must exist first — the lazy
  // base-scoring trigger computes it deterministically from USDA data.
  if (recipe.final_score_10 == null) {
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
    medications: { name: string; rxcui: string | null }[];
  } | null;
  if (!profile) {
    return NextResponse.json({ error: "No health profile" }, { status: 403 });
  }

  // Idempotency / staleness: reuse the cache unless the profile is newer or the
  // recipe's base score changed.
  const { data: cacheRaw } = await admin
    .from("recipe_personalized_scores" as never)
    .select("profile_updated_at, base_final_score_10")
    .eq("user_id" as never, user.id as never)
    .eq("recipe_id" as never, recipe.id as never)
    .maybeSingle();
  const cache = cacheRaw as unknown as {
    profile_updated_at: string;
    base_final_score_10: number | null;
  } | null;
  // Staleness keys on the PROFILE only — the Match Score depends on the profile
  // + the recipe's bioactivities/points, not on final_score_10 (which can change
  // on re-score without affecting the match). Coupling to it caused a refresh
  // loop when the page's cached recipe lagged the DB.
  const fresh =
    cache && new Date(cache.profile_updated_at) >= new Date(profile.updated_at);
  if (fresh) {
    return NextResponse.json({ personalized: true });
  }

  try {
    // Bioactivity scores (slug → 0..100) for the Match Score.
    const { data: tagRows } = await admin
      .from("recipe_tags")
      .select("score, tags(slug)")
      .eq("recipe_id", recipe.id);
    const bioBySlug: Record<string, number> = {};
    for (const row of (tagRows as unknown as { score: number; tags: { slug: string } | null }[]) ??
      []) {
      if (row.tags?.slug) bioBySlug[row.tags.slug] = row.score;
    }

    const match = computeMatchScore({
      bioBySlug,
      points: {
        sugar: recipe.sugar_points ?? 0,
        salt: recipe.salt_points ?? 0,
        satFat: recipe.sat_fat_points ?? 0,
        energy: recipe.energy_points ?? 0,
        fiber: recipe.fiber_points ?? 0,
        protein: recipe.protein_points ?? 0,
      },
      track: recipe.track ?? "Solid Food",
      ironRich: !!recipe.iron_rich,
      waterContentPercent: recipe.water_content_pct ?? 0,
      conditions: profile.conditions ?? [],
      goals: profile.goals ?? [],
    });

    // Safety alerts (allergy + medication). The medication path hits external
    // services (RxClass) + optional interaction detection; wrap it best-effort so
    // a slow/failing lookup never blocks writing the match score (which caused a
    // never-resolving "Personalizing…" spinner). Allergy alerts are local + fast.
    const allergyAlerts = detectAllergens(
      recipe.ingredients,
      profile.allergies ?? [],
      profile.allergies_other ?? "",
      (profile.conditions ?? []).includes("celiac-disease"),
    );
    const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    let medicationAlerts: Array<{
      type: "medication";
      severity: string;
      label: string;
      message: string;
    }> = [];
    try {
      let interaction = recipe.interaction_ingredients ?? [];
      if (!interaction.length) {
        interaction = await detectInteractionIngredients(admin, recipe.ingredients);
        await admin
          .from("recipes")
          .update({ interaction_ingredients: interaction } as never)
          .eq("id", recipe.id);
      }
      const resolvedMeds = await resolveMedications(admin, profile.medications ?? []);
      medicationAlerts = interaction
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
    } catch (e) {
      console.error("[recipes/personalize] safety alerts (non-fatal)", e);
    }
    const safetyAlerts = [...allergyAlerts, ...medicationAlerts];

    const { error: upErr } = await admin
      .from("recipe_personalized_scores" as never)
      .upsert(
        {
          user_id: user.id,
          recipe_id: recipe.id,
          base_final_score_10: recipe.final_score_10,
          match_score: match.score,
          match_breakdown: match.breakdown,
          safety_alerts: safetyAlerts,
          profile_updated_at: profile.updated_at,
          // Deprecated columns (kept non-null during the transition).
          base_final_score: Math.round(recipe.final_score_10),
          personalized_final_score: Math.round(recipe.final_score_10),
          adjusted: false,
          applied_modifiers: [],
        } as never,
        { onConflict: "user_id,recipe_id" },
      );
    if (upErr) throw upErr;

    return NextResponse.json({ personalized: true, matchScore: match.score });
  } catch (err) {
    console.error("[recipes/personalize]", err);
    return NextResponse.json({ error: "Failed to personalize" }, { status: 500 });
  }
}
