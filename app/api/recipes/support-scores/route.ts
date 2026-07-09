import { type NextRequest, NextResponse } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  scoreSupports,
  MAX_SUPPORT_SCORES,
  WELLNESS_SUPPORTS,
  type SupportScore,
} from "@/lib/wellness-score";

export const maxDuration = 30;

// `support_scores` isn't in the generated Database types yet (migration not
// regenerated), so use an untyped service-role client for the recipe read/write.
interface RecipeRow {
  id: string;
  title: string;
  short_description: string | null;
  ingredients: unknown;
  why_it_works: string | null;
  support_scores: SupportScore[] | null;
}

function recipesAdmin() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  // Require a signed-in user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Curb LLM cost-abuse: 20 / minute / IP.
  const { success } = await rateLimit(
    `support-scores:${getClientIp(req.headers)}`,
    20,
    60_000,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let recipeId: string;
  try {
    ({ recipeId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!recipeId || typeof recipeId !== "string") {
    return NextResponse.json({ error: "recipeId required" }, { status: 400 });
  }

  const admin = recipesAdmin();

  const { data, error } = await admin
    .from("recipes")
    .select(
      "id, title, short_description, ingredients, why_it_works, support_scores",
    )
    .eq("id", recipeId)
    .maybeSingle();

  if (error) {
    console.error("[support-scores] read", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recipe = data as unknown as RecipeRow;

  // Fill-once: return the cached scores if present. Legacy rows may hold up to 3
  // entries, so cap to the top N by score here too.
  if (Array.isArray(recipe.support_scores) && recipe.support_scores.length) {
    const capped = [...recipe.support_scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUPPORT_SCORES);
    return NextResponse.json({ scores: capped });
  }

  // Every recipe is scored against the same fixed 23 wellness supports.
  let scores: SupportScore[];
  try {
    scores = await scoreSupports(recipe, WELLNESS_SUPPORTS);
  } catch (err) {
    console.error("[support-scores] generate", err);
    return NextResponse.json({ error: "Failed to score" }, { status: 500 });
  }

  if (scores.length) {
    const { error: updateError } = await admin
      .from("recipes")
      .update({ support_scores: scores })
      .eq("id", recipeId);
    if (updateError) {
      console.error("[support-scores] persist", updateError);
    }
  }

  return NextResponse.json({ scores });
}
