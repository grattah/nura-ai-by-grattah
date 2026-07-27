import { NextRequest, NextResponse } from "next/server";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { computeMatchScore } from "@/lib/scoring/match-score";

// Batch Match Score for a set of recipes (PRD §7.4): listing pages and search
// must show the SAME percentage a recipe shows on its detail page. Those pages
// are client components on the anon key and don't load bioactivities, nutrient
// points, or the health profile — so they post their visible recipe ids here and
// get back { id: { percent, label } }.
//
// Consistency is guaranteed by construction: this calls the very same
// computeMatchScore with the same stored inputs as the detail page.

export const maxDuration = 15;

const MAX_IDS = 60; // one screen of cards, bounded work per request

interface RecipeRow {
  id: string;
  track: "Beverage" | "Solid Food" | null;
  iron_rich: boolean | null;
  water_content_pct: number | null;
  sugar_points: number | null;
  salt_points: number | null;
  sat_fat_points: number | null;
  energy_points: number | null;
  fiber_points: number | null;
  protein_points: number | null;
  recipe_tags: { score: number | null; tags: { slug: string } | null }[] | null;
}

export async function POST(req: NextRequest) {
  const {
    data: { user },
  } = await getCachedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { success } = await rateLimit(
    `match-scores:${getClientIp(req.headers)}`,
    60,
    60_000,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let recipeIds: string[];
  try {
    const body = (await req.json()) as { recipeIds?: unknown };
    recipeIds = Array.isArray(body.recipeIds)
      ? body.recipeIds.filter((x): x is string => typeof x === "string").slice(0, MAX_IDS)
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (recipeIds.length === 0) return NextResponse.json({ scores: {} });

  const admin = createServiceRoleClient();

  // Same gate as the detail page: subscriber with a health profile. Anything
  // else returns no scores, so cards simply render no badge (PRD §8).
  const [isSub, { data: profileRaw }] = await Promise.all([
    hasActiveSubscription(admin, user.id),
    admin
      .from("health_profiles")
      .select("conditions, goals")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const profile = profileRaw as unknown as {
    conditions: string[] | null;
    goals: string[] | null;
  } | null;
  if (!isSub || !profile) return NextResponse.json({ scores: {} });

  const conditions = profile.conditions ?? [];
  const goals = profile.goals ?? [];
  if (conditions.length === 0 && goals.length === 0) {
    return NextResponse.json({ scores: {} });
  }

  const { data: rowsRaw } = await admin
    .from("recipes" as never)
    .select(
      "id, track, iron_rich, water_content_pct, sugar_points, salt_points, sat_fat_points, energy_points, fiber_points, protein_points, recipe_tags(score, tags(slug))",
    )
    .in("id" as never, recipeIds as never);
  const rows = (rowsRaw as unknown as RecipeRow[] | null) ?? [];

  const scores: Record<string, { percent: number; label: string }> = {};
  for (const r of rows) {
    const bioBySlug: Record<string, number> = {};
    for (const rt of r.recipe_tags ?? []) {
      if (rt.tags?.slug && rt.score != null) bioBySlug[rt.tags.slug] = rt.score;
    }
    const { highest } = computeMatchScore({
      bioBySlug,
      points: {
        sugar: r.sugar_points ?? 0,
        salt: r.salt_points ?? 0,
        satFat: r.sat_fat_points ?? 0,
        energy: r.energy_points ?? 0,
        fiber: r.fiber_points ?? 0,
        protein: r.protein_points ?? 0,
      },
      track: r.track ?? "Solid Food",
      ironRich: !!r.iron_rich,
      waterContentPercent: r.water_content_pct ?? 0,
      conditions,
      goals,
    });
    if (highest) {
      scores[r.id] = { percent: Math.round(highest.percent), label: highest.label };
    }
  }

  return NextResponse.json({ scores });
}
