import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { recordUsage, usageTokens } from "@/lib/usage-server";

export interface QuestionsRequestBody {
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  description: string;
  // Fuller on-page context (ingredients, method, why it works, inside tip).
  context?: string;
}

const MAX_CONTEXT_LEN = 4000;

export async function POST(req: NextRequest) {
  // Curb LLM cost-abuse (audit M1): 20 generations / minute / IP.
  const { success } = await rateLimit(
    `rag-questions:${getClientIp(req.headers)}`,
    20,
    60_000,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Require auth — this is an LLM call; don't let unauthenticated callers burn
  // Anthropic spend (audit H2). FollowUpSection falls back to static questions
  // for guests.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contextType, title, description, context }: QuestionsRequestBody =
      await req.json();

    const typeLabel =
      contextType === "recipe" ? "wellness recipe" : "health guide";

    // Prefer the richer on-page context; fall back to the short description.
    const details = (context ?? description ?? "").slice(0, MAX_CONTEXT_LEN);

    const { text, usage } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: `You are a health and wellness assistant for the Nuko app.
    Generate exactly 4 natural follow-up questions a curious user might ask
    after reading a ${typeLabel}.

    Rules:
    - Questions must be directly relevant to the specific content provided,
      drawing on its ingredients, method, and benefits where available.
    - Write each as a full sentence ending with a question mark.
    - Keep each question under 80 characters so it fits on a mobile screen.
    - Output ONLY a valid JSON array of 4 strings. No preamble, no markdown fences.`,
      prompt: `Title: ${title}\n${details}`,
    });

    void recordUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      surface: "followup-questions",
      billed: false,
      ...usageTokens(usage),
    });

    const clean = text.replace(/```json|```/g, "").trim();
    const questions: string[] = JSON.parse(clean);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[rag/questions]", err);
    // Return empty array — FollowUpSection falls back to staticQuestions silently
    return NextResponse.json({ questions: [] }, { status: 500 });
  }
}
