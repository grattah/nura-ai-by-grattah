// Generates 4 contextual follow-up questions for a recipe or guide.

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export interface QuestionsRequestBody {
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  description: string;
}

export async function POST(req: NextRequest) {
  try {
    const { contextType, title, description }: QuestionsRequestBody =
      await req.json();

    const typeLabel =
      contextType === "recipe" ? "wellness recipe" : "health guide";

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      system: `You are a health and wellness assistant for the Nura app.
    Generate exactly 4 natural follow-up questions a curious user might ask
    after reading a ${typeLabel}.

    Rules:
    - Questions must be directly relevant to the specific content provided.
    - Write each as a full sentence ending with a question mark.
    - Keep each question under 80 characters so it fits on a mobile screen.
    - Output ONLY a valid JSON array of 4 strings. No preamble, no markdown fences.`,
      prompt: `Title: ${title}\nDescription: ${description}`,
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
