import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        id: z.string().describe("The id of a recipe from the provided list"),
        title: z.string().describe("The title of that recipe"),
      }),
    )
    .max(3)
    .describe(
      "Up to 3 recipes from the provided list that best match what the user is looking for",
    ),
});

type Suggestions = z.infer<typeof SuggestionsSchema>;

// Cache results per search query so repeated/popular searches don't burn
// tokens on a fresh Claude call every time. Lives for the lifetime of the
// server instance.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const suggestionsCache = new Map<
  string,
  { data: Suggestions; expiresAt: number }
>();

function getCachedSuggestions(key: string): Suggestions | null {
  const entry = suggestionsCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    suggestionsCache.delete(key);
    return null;
  }
  return entry.data;
}

export async function POST(req: NextRequest) {
  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const normalizedQuery = query.trim().toLowerCase();

  const cached = getCachedSuggestions(normalizedQuery);
  if (cached) {
    return NextResponse.json(cached);
  }

  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, short_description")
    .limit(200);

  if (error || !recipes || recipes.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: SuggestionsSchema,
      system: `You are a recipe recommendation assistant for the Nura wellness app.
A user searched for a recipe but the direct keyword search returned few or no
good matches. From the list of available recipes below, pick up to 3 that best
match what the user is likely looking for, based on the meaning and intent of
their search — not just keyword overlap.

Available recipes (id | title | description):
${recipes
  .map((r) => `${r.id} | ${r.title} | ${r.short_description ?? ""}`)
  .join("\n")}

Only return ids that appear in the list above, with their exact titles. If
nothing is reasonably relevant to the search, return an empty array.`,
      prompt: `The user searched for: "${query.trim()}"`,
    });

    suggestionsCache.set(normalizedQuery, {
      data: object,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(object);
  } catch (err) {
    console.error("[recipe-suggestions]", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 },
    );
  }
}
