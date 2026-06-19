import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getTokenState, meter } from "@/lib/credits-server";
import { hasActiveSubscription } from "@/lib/subscription";
import { MAX_OUTPUT_TOKENS } from "@/lib/credits";

export const maxDuration = 30;

const PersonalizedSearchSchema = z.object({
  summary: z
    .string()
    .describe(
      "2 warm sentences acknowledging the concern and briefly previewing what was found",
    ),
  whatToTry: z
    .object({
      title: z
        .string()
        .describe(
          "A short, specific action title starting with a verb, e.g. 'Try peppermint or ginger support'",
        ),
      description: z
        .string()
        .describe(
          "2 plain sentences explaining the benefit of this specific suggestion, e.g. 'Peppermint may help relax digestive muscles and reduce trapped gas. Ginger may support digestion and help reduce inflammation.'",
        ),
    })
    .describe(
      "The single most impactful, immediately actionable recommendation for this concern — the top-line takeaway a user can act on right now",
    ),
  whyItWorks: z
    .array(z.string())
    .describe(
      "3 plain-text bullet points explaining the science or reasoning behind the recommendations",
    ),
  drinksToTry: z
    .array(z.object({ name: z.string() }))
    .describe("Up to 5 specific named drinks or beverages to try"),
  tryTheseToo: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .describe(
      "Up to 3 complementary non-drink lifestyle practices (e.g. gentle walking, belly massage)",
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

  const hasAccess = await hasActiveSubscription(supabase, user.id);

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Subscription required" },
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
  const state = await getTokenState(user.id);
  if (state.totalRemaining <= 0) {
    return NextResponse.json(
      { error: "insufficient_tokens", state },
      { status: 402 },
    );
  }

  try {
    const { object, usage } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      maxOutputTokens: MAX_OUTPUT_TOKENS.search,
      schema: PersonalizedSearchSchema,
      system: `You are a warm, knowledgeable health and wellness assistant for the Nuko app.
A user has shared a personal health concern. Provide personalized, evidence-based
wellness guidance focused on drinks and beverages that may help, alongside
complementary lifestyle practices.

Rules:
- Be warm, empathetic, and conversational — acknowledge their specific concern
- "whatToTry" is the single most actionable top-line recommendation — think of it as the one thing the user should try first; title starts with a verb ("Try...", "Add...", "Sip...")
- "drinksToTry" must be specific named beverages (e.g. "Ginger Lemon Tea", "Aloe Vera Detox Juice", "Peppermint Tea")
- "tryTheseToo" must be non-drink lifestyle practices (gentle movement, massage, breathing, etc.)
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
