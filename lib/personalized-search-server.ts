import "server-only";
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTokenState, meter, type TokenState } from "@/lib/credits-server";
import { tryConsumeFreeView } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { MAX_OUTPUT_TOKENS, FREE_SURFACES } from "@/lib/credits";

const SURFACE = FREE_SURFACES.personalizedSearch;

// Flat schema (no nested objects / arrays-of-objects) so smaller models like
// Haiku can fill it reliably via the AI SDK's structured-output mode.
export const PersonalizedSearchSchema = z.object({
  summary: z
    .string()
    .describe(
      "2 warm sentences acknowledging the concern and briefly previewing what was found",
    ),
  whatToTryTitle: z
    .string()
    .describe(
      "A short, specific action title starting with a verb, e.g. 'Try peppermint or ginger support'",
    ),
  whatToTryDescription: z
    .string()
    .describe(
      "2 plain sentences explaining the benefit of the single top recommendation, e.g. 'Peppermint may help relax digestive muscles and reduce trapped gas. Ginger may support digestion and help reduce inflammation.'",
    ),
  whyItWorks: z
    .array(z.string())
    .describe(
      "3 plain-text points explaining the science or reasoning behind the recommendations",
    ),
  drinksToTry: z
    .array(z.string())
    .describe("Up to 5 specific named drinks or beverages to try (names only)"),
  tryTheseToo: z
    .array(z.string())
    .describe(
      "Up to 3 complementary non-drink lifestyle practices, each a short plain sentence with its benefit, e.g. 'Gentle walking after meals to help move trapped gas'",
    ),
});

export type PersonalizedSearchResult = z.infer<typeof PersonalizedSearchSchema>;

export type PersonalizedSearchOutcome =
  | { status: "ok"; result: PersonalizedSearchResult }
  | { status: "blocked" } // out of free uses, or a lapsed subscriber
  | { status: "out_of_tokens"; state: TokenState } // subscriber with no tokens
  | { status: "error" };

/**
 * Run a personalized search on the fly (no caching): gate access, generate via
 * Claude, and meter/record the use. Used by both the server page render and the
 * API route. Callers must pass an authenticated user's id.
 */
export async function runPersonalizedSearch(
  supabase: SupabaseClient<Database>,
  userId: string,
  rawQuery: string,
): Promise<PersonalizedSearchOutcome> {
  const query = rawQuery.trim();
  if (!query) return { status: "error" };

  // Access model: subscribers use the token system; brand-new (never-subscribed)
  // users get a few free uses of this surface; lapsed subscribers are blocked.
  const [activeSub, everSubscribed] = await Promise.all([
    hasActiveSubscription(supabase, userId),
    hasEverSubscribed(supabase, userId),
  ]);

  if (!activeSub && everSubscribed) return { status: "blocked" };

  if (!activeSub) {
    // New user in free trial — count this distinct query (deduped).
    const allowed = await tryConsumeFreeView(
      userId,
      SURFACE,
      query.toLowerCase(),
    );
    if (!allowed) return { status: "blocked" };
  }

  if (activeSub) {
    const state = await getTokenState(userId);
    if (state.totalRemaining <= 0) return { status: "out_of_tokens", state };
  }

  try {
    const { object, usage } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      maxOutputTokens: MAX_OUTPUT_TOKENS.search,
      schema: PersonalizedSearchSchema,
      // One-shot repair: Haiku can leak tool-call XML or drop fields; coerce the
      // output into valid JSON before the SDK re-validates.
      experimental_repairText: async ({ text, error }) => {
        try {
          const { text: repaired } = await generateText({
            model: anthropic("claude-haiku-4-5"),
            maxOutputTokens: MAX_OUTPUT_TOKENS.search,
            system:
              "You fix malformed JSON. Output ONLY valid minified JSON — no prose, no markdown, no code fences, no XML tags.",
            prompt: `This was meant to be JSON matching exactly this shape:
{ "summary": string, "whatToTryTitle": string, "whatToTryDescription": string, "whyItWorks": string[], "drinksToTry": string[], "tryTheseToo": string[] }

Return corrected JSON with every field present (infer sensible values from the rest if a field is missing or malformed). Strip any stray XML/tool tags.

Validation error:
${error.message}

Broken output:
${text}`,
          });
          return repaired.trim();
        } catch {
          return null;
        }
      },
      system: `You are a warm, knowledgeable health and wellness assistant for the Nuko app.
A user has shared a personal health concern. Provide personalized, evidence-based
wellness guidance focused on drinks and beverages that may help, alongside
complementary lifestyle practices.

Rules:
- Be warm, empathetic, and conversational — acknowledge their specific concern
- "whatToTryTitle" + "whatToTryDescription" are the single most actionable top-line recommendation — the one thing to try first; the title starts with a verb ("Try...", "Add...", "Sip...")
- "drinksToTry" must be specific named beverages as plain strings (e.g. "Ginger Lemon Tea", "Aloe Vera Detox Juice", "Peppermint Tea")
- "tryTheseToo" must be non-drink lifestyle practices as plain strings (gentle movement, massage, breathing, etc.)
- "whyItWorks" should explain the mechanism — why the ingredients or practices help
- All strings must be plain prose: no markdown, no asterisks, no bullet prefixes, no headers
- Keep everything warm and specific to what the user shared, not generic`,
      prompt: `The user shared: "${query}"

Provide personalized wellness guidance for this concern.`,
    });

    // Subscribers meter real token usage; new users already consumed their free
    // use above (deduped by query).
    if (activeSub) {
      const tokens =
        usage?.totalTokens ??
        (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
      await meter(userId, tokens, "personalized-search");
    }

    return { status: "ok", result: object };
  } catch (err) {
    console.error("[personalized-search]", err);
    return { status: "error" };
  }
}
