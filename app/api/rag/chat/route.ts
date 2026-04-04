// app/api/rag/chat/route.ts
// RAG pipeline (AI SDK 5):
//   1. retrieve() — embed query → search vector DB scoped to contextId
//   2a. Chunks found  → stream answer grounded in retrieved context
//   2b. No chunks     → stream answer with web_search tool (allowed domains only)
//
// Switching the LLM:
//   - Anthropic (current): anthropic("claude-sonnet-4-20250514")
//   - Gemini:  import { google } from "@ai-sdk/google"
//              google("gemini-2.5-flash")
//   No other changes needed — the AI SDK normalises the interface.

import { stepCountIs, streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { type NextRequest } from "next/server";
import { retrieve, formatContext } from "@/lib/rag";

export const maxDuration = 30;

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  allowedDomains: string[];
}

function buildSystemPrompt(
  typeLabel: string,
  title: string,
  context: string | null,
  domainList: string,
): string {
  if (context) {
    return `You are a knowledgeable health and wellness assistant for the Nura app.
You are answering a follow-up question about a specific ${typeLabel} called "${title}".

Use ONLY the retrieved context below to answer. If the context does not contain
enough information, say so clearly — do not invent health claims.
Keep your answer concise (3–5 sentences), warm, and plain-English.
Do not use bullet points or headers.

Retrieved context:
${context}`;
  }

  return `You are a knowledgeable health and wellness assistant for the Nura app.
You are answering a follow-up question about a specific ${typeLabel} called "${title}".

You have access to a web search tool. You MUST restrict every search to these
trusted health sources by including the site filter in every query:
${domainList}

Keep your answer concise (3–5 sentences), warm, and plain-English.
Do not use bullet points or headers.
If none of the allowed sources have relevant information, say so clearly.`;
}

export async function POST(req: NextRequest) {
  const {
    messages,
    contextId,
    contextType,
    title,
    allowedDomains,
  }: ChatRequestBody = await req.json();

  const userQuestion = messages[messages.length - 1].content;
  const typeLabel = contextType === "recipe" ? "recipe" : "health guide";
  const domainList = allowedDomains.map((d) => `site:${d}`).join(" OR ");

  const { chunks, hasGoodResults } = await retrieve(userQuestion, contextId);

  // ── Path A: answer grounded in vector DB context ───────────────────────────
  if (hasGoodResults) {
    const result = streamText({
      model: google("gemini-2.5-flash"),
      // model: anthropic("claude-sonnet-4-20250514"), // SWAP model here
      system: buildSystemPrompt(
        typeLabel,
        title,
        formatContext(chunks),
        domainList,
      ),
      messages,
    });

    return result.toUIMessageStreamResponse();
  }

  // ── Path B: restricted web search fallback ─────────────────────────────────
  const result = streamText({
    model: google("gemini-2.5-flash"),
    // model: anthropic("claude-sonnet-4-20250514"), // SWAP model here
    system: buildSystemPrompt(typeLabel, title, null, domainList),
    messages,
    tools: {
      webSearch: tool({
        description: `Search trusted health websites for information about "${title}".
Always include the domain restriction in your query: ${domainList}`,
        // AI SDK 5: `parameters` renamed to `inputSchema`
        inputSchema: z.object({
          query: z
            .string()
            .describe("Search query including required site: domain filters."),
        }),
        execute: async ({ query }) => {
          const res = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
            {
              headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
              },
            },
          );

          if (!res.ok) return { results: [] };

          const data = await res.json();
          return {
            results: (data.web?.results ?? [])
              .slice(0, 5)
              .map(
                (r: { title: string; description: string; url: string }) => ({
                  title: r.title,
                  snippet: r.description,
                  url: r.url,
                }),
              ),
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
