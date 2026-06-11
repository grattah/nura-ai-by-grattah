//   1. retrieve() — embed query → search vector DB scoped to contextId
//   2a. Chunks found  → stream answer grounded in retrieved context
//   2b. No chunks     → stream answer with web_search tool (allowed domains only)
//

import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { type NextRequest } from "next/server";
import { retrieve, formatContext } from "@/lib/rag";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 30;

// Caps on client-controlled values that get injected into the prompt / search
// (audit M1) — bound cost and prompt-injection surface.
const MAX_MESSAGES = 20;
const MAX_DOMAINS = 10;
const MAX_TITLE_LEN = 200;

interface ChatRequestBody {
  messages: UIMessage[];
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  allowedDomains: string[];
  description: string;
}

function buildSystemPrompt(
  typeLabel: string,
  title: string,
  context: string | null,
  domainList: string,
  description?: string,
): string {
  if (context) {
    return `You are a warm, knowledgeable health and wellness assistant for the Nura app.
You are answering a follow-up question about a specific ${typeLabel} called "${title}".

You have two sources of knowledge to draw from:
1. The retrieved context below — treat this as grounding material specific to this ${typeLabel}.
2. Your own broad knowledge of nutrition, wellness, ingredients, and health science.

Use both freely. Lead with what the context tells you, then expand with your own knowledge
to give a richer, more useful answer. You do not need to stick strictly to the context —
if you know something relevant and well-established that it doesn't cover, include it.

Only avoid: inventing specific statistics, citing sources you haven't seen, or making
strong clinical claims (e.g. "this cures X"). For general nutritional and wellness
knowledge, speak with confidence.

Keep your answer to 3–5 sentences, warm, and plain-English.
Do not use any markdown formatting — no bold, no italics, no bullet points,
no headers, no asterisks. Write in plain prose only.

Retrieved context:
${context}`;
  }

  return `You are a warm, knowledgeable health and wellness assistant for the Nura app.
You are answering a follow-up question about a specific ${typeLabel} called "${title}".
${description ? `\nContext about this ${typeLabel}:\n${description}\n` : ""}
You have access to a web search tool, and you also have broad knowledge of nutrition,
wellness, ingredients, and health science that you should use freely.

WHEN TO SEARCH:
Search when the question asks about something specific, current, or clinical
(drug interactions, specific medical conditions, recent research). For general
questions about ingredients, nutrition, wellness benefits, or cooking — answer
directly from your own knowledge first. Only search if your knowledge feels
insufficient for the specific question.

IF YOU SEARCH, use these sources in order of preference:
1. ${domainList}
2. PubMed, NIH, NHS, CDC, WHO, BMJ, Lancet
Avoid forums, blogs, supplement sites, or sensationalist sources.

TONE AND STYLE:
- Speak with confidence about well-established nutrition and wellness knowledge.
- You do not need a source for every claim — general nutritional facts are fine to state directly.
- If you genuinely don't know something specific, say so briefly, then share what you do know.
- Keep answers to 3–5 sentences, warm, conversational, and plain-English.
- Do not use any markdown formatting — no bold, no italics, no bullet points,
  no headers, no asterisks. Write in plain prose only.
- Do NOT narrate your search process. Return only your final answer.`;
}

export async function POST(req: NextRequest) {
  // Curb LLM cost-abuse (audit M1): 20 messages / minute / IP.
  const { success } = await rateLimit(
    `rag-chat:${getClientIp(req.headers)}`,
    20,
    60_000,
  );
  if (!success) {
    return new Response(JSON.stringify({ error: "Too many requests." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const {
      messages,
      contextId,
      contextType,
      title,
      allowedDomains,
      description,
    }: ChatRequestBody = await req.json();

    // Clamp client-controlled inputs before they reach the model / web search.
    const safeMessages = Array.isArray(messages)
      ? messages.slice(-MAX_MESSAGES)
      : [];
    const safeTitle = String(title ?? "").slice(0, MAX_TITLE_LEN);
    const safeDomains = (Array.isArray(allowedDomains) ? allowedDomains : [])
      .filter((d): d is string => typeof d === "string")
      .slice(0, MAX_DOMAINS);

    const lastMessage = safeMessages[safeMessages.length - 1];
    const userQuestion =
      lastMessage?.parts?.find((p) => p.type === "text")?.text ?? "";
    const typeLabel = contextType === "recipe" ? "recipe" : "health guide";
    const domainList = safeDomains.map((d) => `site:${d}`).join(" OR ");

    const { chunks, hasGoodResults } = await retrieve(
      userQuestion,
      contextId,
      6,
      0.5,
    );

    // ── Path A: answer grounded in vector DB context ───────────────────────────
    if (hasGoodResults) {
      const result = streamText({
        model: anthropic("claude-sonnet-4-6"),
        system: buildSystemPrompt(
          typeLabel,
          safeTitle,
          formatContext(chunks),
          domainList,
        ),
        messages: convertToModelMessages(safeMessages),
      });

      return result.toUIMessageStreamResponse();
    }

    // PATH B: Web search fallback
    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: buildSystemPrompt(
        typeLabel,
        safeTitle,
        null,
        domainList,
        description,
      ),
      messages: convertToModelMessages(safeMessages),

      providerOptions: {
        anthropic: {
          disableParallelToolUse: true,
        },
      },

      tools: {
        webSearch: tool({
          description: `Search for health and wellness information about the ${typeLabel} "${safeTitle}".
Use site: filters for trusted sources. Start with the preferred domains (${domainList}),
then broaden to authoritative sources like site:nhs.uk, site:nih.gov, site:pubmed.ncbi.nlm.nih.gov
if the preferred domains return no useful results.`,
          inputSchema: z.object({
            query: z
              .string()
              .describe(
                "Search query including required site: domain filters.",
              ),
          }),

          // Cache the tool definition with Anthropic — saves tokens on every
          // step of the agentic loop after the first call
          providerOptions: {
            anthropic: {
              cacheControl: { type: "ephemeral" },
            },
          },

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
  } catch (err) {
    console.error("[chat route error]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
