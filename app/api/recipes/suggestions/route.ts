import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z
          .string()
          .describe("A short, specific wellness drink/recipe name"),
      }),
    )
    .max(5)
    .describe(
      "Exactly 5 distinct new recipe names closely related to the user's search",
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
  // Curb LLM cost-abuse (audit M1): 20 generations / minute / IP.
  const { success } = await rateLimit(
    `recipe-suggestions:${getClientIp(req.headers)}`,
    20,
    60_000,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Require auth — this is an LLM call (recipe suggestions feed the paid
  // generate flow); don't let unauthenticated callers burn Anthropic spend
  // (audit H2).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query?.trim() || query.length > 200) {
    return NextResponse.json(
      { error: "Query is required (max 200 chars)" },
      { status: 400 },
    );
  }

  const normalizedQuery = query.trim().toLowerCase();

  const cached = getCachedSuggestions(normalizedQuery);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: SuggestionsSchema,
      maxOutputTokens: 256,
      system: `You are a recipe ideas assistant for the Nuko wellness app.
A user searched for a wellness drink/recipe that wasn't in our catalogue. Invent
exactly 5 NEW, distinct recipe names that are closely related and convincingly
similar to what they searched for — the kind of drink/recipe someone making that
search would love to discover. DO NOT SUGGEST FOOD RECIPES. All the recipes you suggest MUST be limited to drinks.

Rules:
- Return plain, specific drink/recipe names only (e.g. "Cucumber Mint Cooler").
- 5 distinct ideas; no duplicates and don't simply repeat the search verbatim.
- Keep them realistic, home-makeable wellness drinks/recipes.
- No medical claims, no descriptions — just the names.`,
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
