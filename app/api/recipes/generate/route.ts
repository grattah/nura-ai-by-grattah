import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { WELLNESS_SOURCES } from "@/lib/wellness-sources";
import { reserve, settle, release } from "@/lib/tokens/server";
import { recordUsage } from "@/lib/usage-server";
import { tryConsumeFreeView } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { MAX_OUTPUT_TOKENS, FREE_SURFACES } from "@/lib/credits";
import { classifyDrinkType } from "@/lib/drink-types";

const SURFACE = FREE_SURFACES.recipeGenerate;

import {
  INTRO_RULE,
  WHY_IT_WORKS_RULE,
} from "@/lib/recipe-copy";

export const maxDuration = 60;

const MAX_DOMAINS = 8;

const RecipeSchema = z.object({
  title: z
    .string()
    .describe("Short recipe name, e.g. 'Ginger Lemon Soothing Tea'"),
  short_description: z
    .string()
    .describe(
      "One or two warm sentences on what the drink is, how it tastes, and the everyday benefit. No body systems, organs, or clinical markers.",
    ),
  recipe_section_title: z
    .string()
    .describe("A short section heading, e.g. 'How to make it'"),
  ingredients: z
    .array(z.object({ emoji: z.string(), label: z.string() }))
    .describe(
      "Ingredients, each with a single relevant emoji and a label like '1 cup brewed green tea'",
    ),
  how_to_make: z
    .array(z.object({ step: z.string(), instruction: z.string() }))
    .describe(
      "Ordered steps; `step` is the number as a string ('1','2',...) and `instruction` is one plain sentence",
    ),
  preview_ingredients: z
    .array(z.string())
    .describe(
      "3-5 key ingredient names only (no amounts), for the card preview",
    ),
  why_it_works: z
    .string()
    .describe(
      "2-3 plain sentences on the mechanism — why these ingredients help",
    ),
  inside_tip: z.string().describe("One practical preparation or usage tip"),
  nutrition: z
    .object({
      kcal: z.number().describe("Approx. energy per serving (kilocalories)"),
      protein: z.number().describe("Protein per serving (grams)"),
      fat: z.number().describe("Fat per serving (grams)"),
      carbs: z.number().describe("Carbohydrates per serving (grams)"),
      fiber: z.number().describe("Dietary fiber per serving (grams)"),
    })
    .describe(
      "Approximate per-serving nutrition, estimated from the ingredients and amounts",
    ),
  follow_up_questions: z
    .array(z.string())
    .describe("3 short follow-up questions a curious user might ask"),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [activeSub, everSubscribed] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    hasEverSubscribed(supabase, user.id),
  ]);

  if (!activeSub && everSubscribed) {
    return NextResponse.json(
      { error: "Subscription required", hasEverSubscribed: true },
      { status: 403 },
    );
  }

  let name: string;
  let concern: string | undefined;
  let allowedDomains: unknown;
  try {
    ({ name, concern, allowedDomains } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const cleanName = name.trim();
  const norm = cleanName.toLowerCase();

  if (!activeSub) {
    const allowed = await tryConsumeFreeView(user.id, SURFACE, norm);
    if (!allowed) {
      return NextResponse.json(
        { error: "Subscription required", hasEverSubscribed: false },
        { status: 403 },
      );
    }
  }

  const domains = (
    Array.isArray(allowedDomains) ? allowedDomains : WELLNESS_SOURCES
  )
    .filter((d): d is string => typeof d === "string")
    .slice(0, MAX_DOMAINS);
  const domainList = (domains.length ? domains : WELLNESS_SOURCES).join(", ");

  // Never build a PostgREST .or() filter from user input (filter injection); query each column separately.
  const [{ data: priorGen }, { data: titleMatch }, { data: descMatch }] =
    await Promise.all([
      supabase
        .from("recipes")
        .select("id")
        .eq("generated_from" as never, norm as never)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("recipes")
        .select("id")
        .ilike("title" as never, `%${cleanName}%` as never)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("recipes")
        .select("id")
        .ilike("short_description" as never, `%${cleanName}%` as never)
        .limit(1)
        .maybeSingle(),
    ]);
  const existing = titleMatch ?? descMatch;
  if (priorGen) {
    return NextResponse.json({ id: priorGen.id, existed: true });
  }
  if (existing) {
    return NextResponse.json({ id: existing.id, existed: true });
  }

  const admin = createServiceRoleClient();

  const { data: lastOrder } = await admin
    .from("recipes")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextDisplayOrder = (lastOrder?.display_order ?? 0) + 1;

  let reservation = null as Awaited<ReturnType<typeof reserve>>;
  if (activeSub) {
    reservation = await reserve(user.id, "generate");
    if (!reservation) {
      return NextResponse.json(
        { error: "insufficient_tokens" },
        { status: 402 },
      );
    }
  }

  let recipe: z.infer<typeof RecipeSchema>;
  let recipeUsage:
    | { totalTokens?: number; inputTokens?: number; outputTokens?: number }
    | undefined;
  try {
    const result = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      maxOutputTokens: MAX_OUTPUT_TOKENS.generate,
      schema: RecipeSchema,
      system: `You are a culinary wellness expert for the Nuko app. Create one specific,
safe, evidence-aware wellness drink/recipe. Keep all text plain prose — no markdown,
asterisks, or headers. Be concrete and practical.

SOURCES: Base the recipe on well-established nutrition science, consistent with trusted
sources such as ${domainList}, then PubMed, NIH, NHS, CDC, and WHO. Avoid forums, blogs,
supplement-marketing, and sensationalist or unproven claims. Do not invent statistics or
make strong clinical claims (e.g. "cures X").

${INTRO_RULE}

${WHY_IT_WORKS_RULE}

NUTRITION: Provide realistic per-serving nutrition (kcal, protein, fat, carbs, fiber)
estimated from the actual ingredients and their amounts. Use sensible whole/round numbers;
do not fabricate false precision.`,
      prompt: `Create a recipe for: "${cleanName}".${
        concern ? `\nThe user's wellness concern was: "${concern}".` : ""
      }\n\nKeep it realistic and easy to make at home.`,
    });
    recipe = result.object;
    recipeUsage = result.usage;
  } catch (err) {
    console.error("[recipes/generate] text", err);
    if (reservation) await release(reservation);
    return NextResponse.json(
      { error: "Failed to generate recipe" },
      { status: 500 },
    );
  }

  const insertPayload = {
    title: recipe.title,
    short_description: recipe.short_description,
    recipe_section_title: recipe.recipe_section_title,
    ingredients: recipe.ingredients,
    how_to_make: recipe.how_to_make,
    preview_ingredients: recipe.preview_ingredients,
    why_it_works: recipe.why_it_works,
    inside_tip: recipe.inside_tip,
    nutrition: recipe.nutrition,
    follow_up_questions: recipe.follow_up_questions,
    image_url: null,
    source_url: "",
    likes: 0,
    display_order: nextDisplayOrder,
    is_todays_recipe: false,
    status: "pending",
    created_by: user.id,
    generated_from: norm,
    drink_type: classifyDrinkType(recipe.title),
  };

  const { data: inserted, error: insertErr } = await admin
    .from("recipes")
    .insert(insertPayload as never)
    .select("id")
    .single();

  let recipeId: string;
  if (insertErr || !inserted) {
    if (insertErr?.code === "23505") {
      const { data: dupe } = await admin
        .from("recipes")
        .select("id")
        .eq("created_by" as never, user.id as never)
        .eq("generated_from" as never, norm as never)
        .limit(1)
        .maybeSingle();
      if (dupe) {
        if (reservation) await release(reservation);
        return NextResponse.json({ id: dupe.id, existed: true });
      }
    }
    console.error("[recipes/generate] insert", insertErr);
    if (reservation) await release(reservation);
    return NextResponse.json(
      { error: "Failed to save recipe" },
      { status: 500 },
    );
  } else {
    recipeId = inserted.id;
  }

  if (reservation) {
    await settle(reservation);
    void recordUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      surface: "recipe-generate",
      userId: user.id,
      inputTokens: recipeUsage?.inputTokens,
      outputTokens: recipeUsage?.outputTokens,
      totalTokens: recipeUsage?.totalTokens,
      units: reservation.costUnits,
      billed: true,
    });
  }

  return NextResponse.json({ id: recipeId, existed: false });
}
