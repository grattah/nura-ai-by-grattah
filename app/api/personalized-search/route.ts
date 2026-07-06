import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getTokenState, meter } from "@/lib/credits-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import { MAX_OUTPUT_TOKENS } from "@/lib/credits";

export const maxDuration = 30;

// Flat schema (no nested objects / arrays-of-objects) so smaller models like
// Haiku can fill it reliably via the AI SDK's structured-output mode.
const PersonalizedSearchSchema = z.object({
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Use getUser() (revalidates with the auth server) rather than getSession()
  // for server-side authorization (audit M3).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Access = active subscription OR unspent free-trial units. Fetch the reads
  // together to save round-trips on the common (authorized) path.
  const [activeSub, state] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    getTokenState(user.id),
  ]);

  const hasAccess = activeSub || state.freeRemaining > 0;

  if (!hasAccess) {
    // Out of access: signal whether the user ever subscribed so the client can
    // pick the right wall (new → paywall modal w/ "trial ended"; old → overlay).
    const everSubscribed = await hasEverSubscribed(supabase, user.id);
    return NextResponse.json(
      { error: "Subscription required", hasEverSubscribed: everSubscribed },
      { status: 403 },
    );
  }

  let query: string;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Gate before the call; we meter the real usage after it succeeds (cache hits
  // never reach the route).
  if (state.totalRemaining <= 0) {
    return NextResponse.json(
      { error: "insufficient_tokens", state },
      { status: 402 },
    );
  }

  try {
    const { object, usage } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      // model: anthropic("claude-sonnet-4-6"),
      maxOutputTokens: MAX_OUTPUT_TOKENS.search,
      schema: PersonalizedSearchSchema,
      // One-shot repair: if the model returns malformed/partial output (Haiku can
      // leak tool-call XML or drop fields), do a single corrective pass that
      // coerces it into valid JSON for the schema before the SDK re-validates.
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
          return null; // give up — generateObject surfaces the original error
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
      prompt: `The user shared: "${query.trim()}"

Provide personalized wellness guidance for this concern.`,
    });

    // Meter the real Claude usage now that it succeeded.
    const tokens =
      usage?.totalTokens ??
      (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
    await meter(user.id, tokens, "personalized-search");

    return NextResponse.json(object);
  } catch (err) {
    console.error("[personalized-search]", err);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
