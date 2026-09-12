import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import {
  detectInteractionIngredients,
  type InteractionIngredient,
} from "@/lib/interactions/detect";
import { resolveMedications } from "@/lib/interactions/rxclass";
import type { Bucket } from "@/lib/interactions/buckets";
import { detectAllergens } from "@/lib/interactions/allergens";

export const maxDuration = 60;

/** Computes and caches allergy and medication alerts for this user and recipe. */
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
    .select("id, ingredients, interaction_ingredients")
    .eq("id", id)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    ingredients: unknown;
    interaction_ingredients: InteractionIngredient[] | null;
  } | null;
  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await hasActiveSubscription(admin, user.id))) {
    return NextResponse.json({ error: "Subscription required" }, { status: 403 });
  }

  const { data: profileRaw } = await admin
    .from("health_profiles")
    .select("updated_at, conditions, allergies, allergies_other, medications")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = profileRaw as unknown as {
    updated_at: string;
    conditions: string[];
    allergies: string[];
    allergies_other: string | null;
    medications: { name: string; rxcui: string | null }[];
  } | null;
  if (!profile) {
    return NextResponse.json({ error: "No health profile" }, { status: 403 });
  }

  const { data: cache } = await admin
    .from("recipe_personalized_scores")
    .select("profile_updated_at")
    .eq("user_id", user.id)
    .eq("recipe_id", recipe.id)
    .maybeSingle();
  if (cache && new Date(cache.profile_updated_at) >= new Date(profile.updated_at)) {
    return NextResponse.json({ personalized: true });
  }

  try {
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
      .from("recipe_personalized_scores")
      .upsert(
        {
          user_id: user.id,
          recipe_id: recipe.id,
          safety_alerts: safetyAlerts,
          profile_updated_at: profile.updated_at,
        } as never,
        { onConflict: "user_id,recipe_id" },
      );
    if (upErr) throw upErr;

    return NextResponse.json({ personalized: true });
  } catch (err) {
    console.error("[recipes/personalize]", err);
    return NextResponse.json({ error: "Failed to personalize" }, { status: 500 });
  }
}
