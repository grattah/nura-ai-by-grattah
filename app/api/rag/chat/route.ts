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
import { createClient } from "@/lib/supabase/server";
import { reserve, settle, release } from "@/lib/tokens/server";
import { recordUsage } from "@/lib/usage-server";
import { freeUseCount, recordFreeUse } from "@/lib/free-trial-server";
import { hasActiveSubscription, hasEverSubscribed } from "@/lib/subscription";
import {
  MAX_OUTPUT_TOKENS,
  FREE_SURFACES,
  FREE_USES_PER_SURFACE,
} from "@/lib/credits";

const SURFACE = FREE_SURFACES.followupChat;

function usageTokens(u: {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
}): number {
  return u?.totalTokens ?? (u?.inputTokens ?? 0) + (u?.outputTokens ?? 0);
}

function jsonError(message: string, status: number, extra?: object) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const maxDuration = 30;

const MAX_MESSAGES = 20;
const MAX_DOMAINS = 10;
const MAX_TITLE_LEN = 200;
const MAX_CONTEXT_LEN = 4000;

interface ChatRequestBody {
  messages: UIMessage[];
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  allowedDomains: string[];
  description: string;
  context?: string;
}

function buildSystemPrompt(
  typeLabel: string,
  title: string,
  context: string | null,
  domainList: string,
  description?: string,
): string {
  if (context) {
    return `You are a warm, knowledgeable health and wellness assistant for the Nuko app.
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

Keep your answer to 3 sentences max, warm, and plain-English.
Do not use any markdown formatting — no bold, no italics, no bullet points,
no headers, no asterisks. Write in plain prose only.

Retrieved context:
${context}`;
  }

  return `You are a warm, knowledgeable health and wellness assistant for the Nuko app.
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

BRAND SAFETY POLICY:
- Never mention, recommend, compare, link to, or reference any external company, website, application, service, product, brand, publication, or platform.
- This rule applies even when the user explicitly asks for external recommendations.
- If the user requests external websites, apps, brands, tools, competitors, or resources, politely decline and provide help using Nuko’s knowledge only.
- Do not generate URLs, company names, app names, marketplace names, social media platforms, or competitor references.
- Keep all responses within the Nuko ecosystem.

TONE AND STYLE:
- Speak with confidence about well-established nutrition and wellness knowledge.
- You do not need a source for every claim — general nutritional facts are fine to state directly.
- If you genuinely don't know something specific, say so briefly, then share what you do know.
- Keep answers to 3 sentences max, warm, conversational, and plain-English.
- Do not use any markdown formatting — no bold, no italics, no bullet points,
  no headers, no asterisks. Write in plain prose only.
- Do NOT narrate your search process. Return only your final answer.`;
}

export async function POST(req: NextRequest) {
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Unauthorized", 401);

  const [activeSub, everSubscribed] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    hasEverSubscribed(supabase, user.id),
  ]);
  if (!activeSub && everSubscribed) {
    return jsonError("Subscription required", 403, { hasEverSubscribed: true });
  }

  let reservation: Awaited<ReturnType<typeof reserve>> = null;

  try {
    const {
      messages,
      contextId,
      contextType,
      title,
      allowedDomains,
      description,
      context,
    }: ChatRequestBody = await req.json();

    const safeMessages = Array.isArray(messages)
      ? messages.slice(-MAX_MESSAGES)
      : [];
    const safeTitle = String(title ?? "").slice(0, MAX_TITLE_LEN);
    const safeDomains = (Array.isArray(allowedDomains) ? allowedDomains : [])
      .filter((d): d is string => typeof d === "string")
      .slice(0, MAX_DOMAINS);
    const safeContext = String(context || description || "").slice(
      0,
      MAX_CONTEXT_LEN,
    );

    const lastMessage = safeMessages[safeMessages.length - 1];
    const userQuestion =
      lastMessage?.parts?.find((p) => p.type === "text")?.text ?? "";
    const typeLabel = contextType === "recipe" ? "recipe" : "health guide";
    const domainList = safeDomains.map((d) => `site:${d}`).join(" OR ");

    const shouldMeter = lastMessage?.role === "user" && !!userQuestion.trim();
    if (shouldMeter) {
      if (activeSub) {
        reservation = await reserve(user.id, "followup");
        if (!reservation) {
          return jsonError("insufficient_tokens", 402, {});
        }
      } else {
        const used = await freeUseCount(user.id, SURFACE);
        if (used >= FREE_USES_PER_SURFACE) {
          return jsonError("Subscription required", 403, {
            hasEverSubscribed: false,
          });
        }
      }
    }
    const onFinish = shouldMeter
      ? ({
          totalUsage,
        }: {
          totalUsage: {
            totalTokens?: number;
            inputTokens?: number;
            outputTokens?: number;
          };
        }) => {
          if (reservation) {
            void settle(reservation);
            void recordUsage({
              provider: "anthropic",
              model: "claude-haiku-4-5",
              surface: "followup-chat",
              userId: user.id,
              totalTokens: usageTokens(totalUsage),
              units: reservation.costUnits,
              billed: true,
            });
          } else if (!activeSub) void recordFreeUse(user.id, SURFACE);
        }
      : undefined;

    const { chunks, hasGoodResults } = await retrieve(
      userQuestion,
      contextId,
      6,
      0.5,
    );

    if (hasGoodResults) {
      const result = streamText({
        model: anthropic("claude-haiku-4-5"),
        maxOutputTokens: MAX_OUTPUT_TOKENS.followup,
        system: buildSystemPrompt(
          typeLabel,
          safeTitle,
          formatContext(chunks),
          domainList,
        ),
        messages: convertToModelMessages(safeMessages),
        onFinish,
      });

      return result.toUIMessageStreamResponse();
    }

    const result = streamText({
      model: anthropic("claude-haiku-4-5"),
      maxOutputTokens: MAX_OUTPUT_TOKENS.followup,
      system: buildSystemPrompt(
        typeLabel,
        safeTitle,
        null,
        domainList,
        safeContext,
      ),
      messages: convertToModelMessages(safeMessages),
      onFinish,

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
    if (reservation) await release(reservation);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
