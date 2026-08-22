import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { recordUsage, usageTokens } from "@/lib/usage-server";
import { createClient } from "@/lib/supabase/server";
import { tryConsumeFreeView } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { FREE_SURFACES } from "@/lib/credits";

export const maxDuration = 30;

const SURFACE = FREE_SURFACES.recipeSuggestions;

const SuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z
          .string()
          .describe("A short, specific wellness drink/recipe name"),
      })
    )
    .max(5)
    .describe(
      "Exactly 5 distinct new recipe names closely related to the user's search"
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
    60_000
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Global daily budget (audit S1): the per-IP limit is bypassable by rotating
  // IPs, so cap the endpoint's total LLM spend as a circuit breaker. 500 fresh
  // generations/day is far above organic guest traffic; cached hits don't count
  // (checked before the budget below).

  // Access model: same as the other gated LLM surfaces — subscribers use the
  // token system; new (never-subscribed) users get FREE_USES_PER_SURFACE free
  // suggestion calls; lapsed subscribers are blocked; guests must sign in.
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

  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query?.trim() || query.length > 200) {
    return NextResponse.json(
      { error: "Query is required (max 200 chars)" },
      { status: 400 }
    );
  }

  const normalizedQuery = query.trim().toLowerCase();

  if (!activeSub) {
    // New user in free trial — count this distinct query up front (deduped by
    // normalized query), so a cache hit below still consumes a use.
    const allowed = await tryConsumeFreeView(user.id, SURFACE, normalizedQuery);
    if (!allowed) {
      return NextResponse.json(
        { error: "Subscription required", hasEverSubscribed: false },
        { status: 403 },
      );
    }
  }

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
      { status: 429 }
    );
  }

  try {
    const { object, usage } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: SuggestionsSchema,
      maxOutputTokens: 256,
      system: `You are a recipe naming assistant for the Nuko wellness app.

A user searched for a wellness drink that is not in our catalogue. Generate exactly 5 realistic drink recipe names that someone searching for that drink would expect to find.

Output format
- Return only the recipe names, one per line.
- No numbering, bullets, explanations, punctuation, or descriptions.

What to suggest
- Suggest drinks only. Never suggest food.
- Each name must be an established, well-known drink with real, documented health benefits — not an invented or novel-sounding combination. If you would not find this drink in a health cookbook, on a wellness blog, or ordered at a juice bar, do not include it.
- Every recipe must contain at least two primary ingredients. Never suggest a single-ingredient recipe, even with a preparation method or drink type attached.

Name construction
- Format: [primary ingredients] + [drink type]. The drink type always ends the name. Nothing follows it — no "with Mint," no parentheticals.
- Exactly two ingredients: "[Ingredient A] & [Ingredient B] [Type]" — e.g. "Beet & Carrot Juice."
- Three or more: comma-separated with "&" before the last — e.g. "Blueberry, Peach & Carrot Smoothie."
- Always use "&" rather than "and."
- Name the specific ingredient. Never use generic category words like "green," "greens," "citrus," "berry," or "nuts" — use spinach, kale, orange, blueberry, almond.
- Include only major ingredients. Leave out minor flavorings and garnishes unless they genuinely define the drink.
- Never include sweeteners or liquid bases in a name: no maple, honey, sugar, water, milk-as-base, yogurt, or agave.
- Do not use filler, marketing, or descriptive words of any kind — including Fresh, Homemade, Classic, Natural, Refresh, Hydrator, Revive, Booster, Energizer, Detox, Elixir, Immunity, Glow, Power, Vitality, Fuel, Splash, Vegan, Protein, Superfood, or Non-Dairy. Only ingredient names and the drink type belong in the name.
- Do not name fruit varieties. Use "Apple," not "Fuji Apple" or "Green Apple."

Drink type
- Must be one of: Juice, Smoothie, Tea, Lassi, Cooler, Milk, Shot, Drinks, Shakes, Sorbet, Bowl.
- Choose the type that is conventionally correct for that combination. Ingredients that yield clean liquid (roots, stalks, leaves, melon, citrus, firm apple and pear) make a Juice. Ingredients whose body is the appeal (berries, banana, avocado, stone fruit, nut butters, cocoa) make a Smoothie. Yogurt-based drinks are Lassis.

Duplicates
- Ingredient order is irrelevant when checking whether a recipe already exists. "Melon & Cucumber Juice" and "Cucumber & Melon Juice" are the same recipe. If one exists, never suggest the other.
- Every suggestion must be distinct in both name and composition.`,
      prompt: `The user searched for: "${query.trim()}"`,
    });

    void recordUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      surface: "suggestions",
      billed: false,
      // Unbilled, but still a real per-user cost — without this the row lands
      // with a NULL user_id and the spend can't be attributed to anyone.
      userId: user.id,
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
      { status: 500 }
    );
  }
}
