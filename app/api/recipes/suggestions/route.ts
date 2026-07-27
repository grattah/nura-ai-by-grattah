import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { recordUsage, usageTokens } from "@/lib/usage-server";

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

  // Global daily budget (audit S1): the per-IP limit is bypassable by rotating
  // IPs, so cap the endpoint's total LLM spend as a circuit breaker. 500 fresh
  // generations/day is far above organic guest traffic; cached hits don't count
  // (checked before the budget below).
  //
  // Public by design: anyone (guest or signed-in) can browse suggestions —
  // /find-recipe is a public page. Only generating a recipe from a suggestion
  // is gated (/api/recipes/generate).

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

  // Global daily budget — only fresh (uncached) LLM generations count.
  const budget = await rateLimit("recipe-suggestions:global", 500, 86_400_000);
  if (!budget.success) {
    return NextResponse.json(
      {
        error:
          "Suggestions are temporarily unavailable. Please try again later.",
      },
      { status: 429 },
    );
  }

  try {
    const { object, usage } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: SuggestionsSchema,
      maxOutputTokens: 256,
      system: `You are a recipe naming assistant for the Nuko wellness app.
A user searched for a wellness drink that is not in our catalogue.
Generate exactly 5 realistic drink recipe names that someone searching for that drink would expect to find.

Rules:
- Return only the recipe names, one per line.
- Suggest drinks only. Never suggest food.
- Each name must be an established, well-known drink with real, documented health benefits, not an invented or novel-sounding combination. If you would not find this drink name in a health cookbook, on a wellness blog, or ordered at a juice bar, do not include it.
- Name format: [Main plant/fruit ingredient(s)] + [drink type]. Example pattern: "Ginger Turmeric Tea," "Beet Carrot Juice," "Mango Lassi."
- Do not use filler, marketing, or descriptive words of any kind, including "Fresh," "Homemade," "Classic," "Natural," or similar. Only ingredient names and drink type words belong in the name.
- Drink type must be one of: Juice, Smoothie, Tea, Lassi, Cooler, Water, Cider, Milk, Shot (only use the type that is conventionally correct for that combination of ingredients).
- Do not use marketing or functional words such as: Refresh, Hydrator, Revive, Booster, Energizer, Detox, Elixir, Immunity, Glow, Power, Vitality, Fuel, Blend (unless it is the natural drink type), Splash.
- No numbering, bullets, explanations, punctuation, or descriptions.`,
      prompt: `The user searched for: "${query.trim()}"`,
    });

    void recordUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      surface: "suggestions",
      billed: false,
      ...usageTokens(usage),
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
