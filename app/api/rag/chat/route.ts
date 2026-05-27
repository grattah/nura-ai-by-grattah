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

export const maxDuration = 30;

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
    return `You are a knowledgeable health and wellness assistant for the Nura app.
You are answering a follow-up question about a specific ${typeLabel} called "${title}".

Use the retrieved context below as your primary source. If the context alone is
insufficient, you may supplement with your general knowledge — but never invent
health claims or cite sources you have not seen.
Keep your answer concise (3–5 sentences), warm, and plain-English.
Do not use bullet points or headers.

Retrieved context:
${context}`;
  }

  return `You are a knowledgeable health and wellness assistant for the Nura app.
You are answering a follow-up question about a specific ${typeLabel} called "${title}".
${description ? `\nHere is a brief description to give you context for your search:\n${description}\n` : ""}
You have access to a web search tool. Follow these search rules strictly:

PREFERRED SOURCES (search these first):
${domainList}

ALSO ACCEPTABLE if the preferred sources yield no useful results:
- Peer-reviewed journals and preprint servers (PubMed, PMC, bioRxiv, NEJM, Lancet, BMJ)
- Government and intergovernmental health bodies (CDC, NHS, WHO, NIH, EMA)
- Accredited university medical centres and teaching hospitals
- Professional clinical associations (AHA, ADA, BDA, etc.)

NEVER USE:
- Forums, blogs, social media, or personal testimonials
- Commercial supplement or product websites
- Any source that makes unsupported or sensationalist health claims

SEARCH STRATEGY:
1. Start with a targeted query restricted to the preferred sources using a site: filter.
2. If that yields insufficient results, broaden to the acceptable sources above — still
   using site: filters where possible.
3. Run up to 3 searches before composing your answer; stop as soon as you have
   enough credible information.
4. If no credible source addresses the question, say so clearly — do not fill gaps
   with speculation.

Do NOT narrate your search process. Do not write phrases like "Let me search…",
"Let me try a broader query…", or any other commentary between tool calls.
Return ONLY your final answer after all searches are complete.

Keep your answer concise (3–5 sentences), warm, and plain-English.
Do not use any markdown formatting — no bold, no italics, no bullet points,
no headers, no asterisks. Write in plain prose only.
Briefly note the source(s) you relied on at the end of your answer (e.g. "According to the NHS…").`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      contextId,
      contextType,
      title,
      allowedDomains,
      description,
    }: ChatRequestBody = await req.json();

    const lastMessage = messages[messages.length - 1];
    const userQuestion =
      lastMessage.parts?.find((p) => p.type === "text")?.text ?? "";
    const typeLabel = contextType === "recipe" ? "recipe" : "health guide";
    const domainList = allowedDomains.map((d) => `site:${d}`).join(" OR ");

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
          title,
          formatContext(chunks),
          domainList,
        ),
        messages: convertToModelMessages(messages),
      });

      return result.toUIMessageStreamResponse();
    }

    // PATH B: Web search fallback
    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: buildSystemPrompt(
        typeLabel,
        title,
        null,
        domainList,
        description,
      ),
      messages: convertToModelMessages(messages),

      providerOptions: {
        anthropic: {
          disableParallelToolUse: true,
        },
      },

      tools: {
        webSearch: tool({
          description: `Search for health and wellness information about the ${typeLabel} "${title}".
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
