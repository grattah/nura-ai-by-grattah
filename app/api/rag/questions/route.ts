// app/api/rag/questions/route.ts
// Generates 4 contextual follow-up questions for a recipe or guide.
// Uses AI SDK generateText — swap the model the same way as chat-route.ts.

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
// import { anthropic } from "@ai-sdk/anthropic";
// To switch to Gemini, swap the import and model call:
// import { google } from "@ai-sdk/google";

export interface QuestionsRequestBody {
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  description: string;
}

export async function POST(_req: NextRequest) {
  try {
    //     const { contextType, title, description }: QuestionsRequestBody =
    //       await req.json();

    //     const typeLabel =
    //       contextType === "recipe" ? "wellness recipe" : "health guide";

    //     const { text } = await generateText({
    //       model: google("gemini-2.5-flash"),
    //       // model: anthropic("claude-sonnet-4-20250514"), // SWAP model here
    //       system: `You are a health and wellness assistant for the Nura app.
    // Generate exactly 4 natural follow-up questions a curious user might ask
    // after reading a ${typeLabel}.

    // Rules:
    // - Questions must be directly relevant to the specific content provided.
    // - Write each as a full sentence ending with a question mark.
    // - Keep each question under 80 characters so it fits on a mobile screen.
    // - Output ONLY a valid JSON array of 4 strings. No preamble, no markdown fences.`,
    //       prompt: `Title: ${title}\nDescription: ${description}`,
    //     });

    //     const clean = text.replace(/```json|```/g, "").trim();
    //     const questions: string[] = JSON.parse(clean);

    // TODO: Revert to AI Response
    const questions = [
      "Does my body actually need a detox?",
      "How long will the detox take and is it sustainable?",
      "Are specialized detox diets or cleanses safe for me?",
      "What are the best foods to include in a detox diet?",
    ];

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("[rag/questions]", err);
    // Return empty array — FollowUpSection falls back to staticQuestions silently
    return NextResponse.json({ questions: [] }, { status: 500 });
  }
}
