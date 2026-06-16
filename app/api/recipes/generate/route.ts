import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { WELLNESS_SOURCES } from "@/lib/wellness-sources";

export const maxDuration = 60;

const MAX_DOMAINS = 8;

const RecipeSchema = z.object({
  title: z
    .string()
    .describe("Short recipe name, e.g. 'Ginger Lemon Soothing Tea'"),
  short_description: z
    .string()
    .describe("One warm sentence describing the recipe and who it helps"),
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
  follow_up_questions: z
    .array(z.string())
    .describe("3 short follow-up questions a curious user might ask"),
  tagSlugs: z
    .array(z.string())
    .describe(
      "1-3 slugs chosen ONLY from the provided tag list that best match this recipe",
    ),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const hasAccess =
    !!sub && (!sub.expires_at || new Date(sub.expires_at) > new Date());

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Subscription required" },
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

  // Trusted sources to ground generation (passed from the page; clamped here).
  const domains = (
    Array.isArray(allowedDomains) ? allowedDomains : WELLNESS_SOURCES
  )
    .filter((d): d is string => typeof d === "string")
    .slice(0, MAX_DOMAINS);
  const domainList = (domains.length ? domains : WELLNESS_SOURCES).join(", ");

  const { data: priorGen } = await supabase
    .from("recipes")
    .select("id")
    .eq("generated_from" as never, norm as never)
    .limit(1)
    .maybeSingle();
  if (priorGen) {
    return NextResponse.json({ id: priorGen.id, existed: true });
  }

  // 2. Reuse an existing recipe whose name matches.
  const { data: existing } = await supabase
    .from("recipes")
    .select("id")
    .or(`title.ilike.%${cleanName}%,short_description.ilike.%${cleanName}%`)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ id: existing.id, existed: true });
  }

  const admin = createServiceRoleClient();

  // Append after existing recipes with a unique order (avoids the old shared 9999).
  const { data: lastOrder } = await admin
    .from("recipes")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextDisplayOrder = (lastOrder?.display_order ?? 0) + 1;

  // Ground tag selection to real tags.
  const { data: tags } = await admin.from("tags").select("id, name, slug");
  const tagList = (tags ?? []).map((t) => `${t.slug} | ${t.name}`).join("\n");

  // 2. Generate the recipe content.
  let recipe: z.infer<typeof RecipeSchema>;
  try {
    ({ object: recipe } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: RecipeSchema,
      system: `You are a culinary wellness expert for the Nuko app. Create one specific,
safe, evidence-aware wellness drink/recipe. Keep all text plain prose — no markdown,
asterisks, or headers. Be concrete and practical.

SOURCES: Base the recipe on well-established nutrition science, consistent with trusted
sources such as ${domainList}, then PubMed, NIH, NHS, CDC, and WHO. Avoid forums, blogs,
supplement-marketing, and sensationalist or unproven claims. Do not invent statistics or
make strong clinical claims (e.g. "cures X").

Available tag slugs (pick 1-3 that genuinely fit, slug on the left):
${tagList}`,
      prompt: `Create a recipe for: "${cleanName}".${
        concern ? `\nThe user's wellness concern was: "${concern}".` : ""
      }\n\nKeep it realistic and easy to make at home.`,
    }));
  } catch (err) {
    console.error("[recipes/generate] text", err);
    return NextResponse.json(
      { error: "Failed to generate recipe" },
      { status: 500 },
    );
  }

  // 3. Insert the recipe (pending, owned by the requesting user).
  const insertPayload = {
    title: recipe.title,
    short_description: recipe.short_description,
    recipe_section_title: recipe.recipe_section_title,
    ingredients: recipe.ingredients,
    how_to_make: recipe.how_to_make,
    preview_ingredients: recipe.preview_ingredients,
    why_it_works: recipe.why_it_works,
    inside_tip: recipe.inside_tip,
    follow_up_questions: recipe.follow_up_questions,
    image_url: null,
    source_url: "",
    likes: 0,
    display_order: nextDisplayOrder,
    is_todays_recipe: false,
    status: "pending",
    created_by: user.id,
    generated_from: norm,
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
        return NextResponse.json({ id: dupe.id, existed: true });
      }
    }
    console.error("[recipes/generate] insert", insertErr);
    return NextResponse.json(
      { error: "Failed to save recipe" },
      { status: 500 },
    );
  } else {
    recipeId = inserted.id;
  }

  // 4. Link tags (skip any slug that doesn't resolve to a real tag).
  const tagIds = (tags ?? [])
    .filter((t) => recipe.tagSlugs.includes(t.slug))
    .map((t) => ({ recipe_id: recipeId, tag_id: t.id }));
  if (tagIds.length) {
    const { error: tagErr } = await admin.from("recipe_tags").insert(tagIds);
    if (tagErr) console.error("[recipes/generate] tags", tagErr);
  }

  // The hero image is generated lazily on first view of the detail page
  // (POST /api/recipes/[id]/image) — reliable on serverless, unlike `after()`.
  return NextResponse.json({ id: recipeId, existed: false });
}
