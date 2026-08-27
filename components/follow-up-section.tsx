"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, SendHorizontal, Loader2, Bot } from "lucide-react";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { SignInModal } from "@/components/auth/SignInModal";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stripMarkdown } from "@/lib/strip-markdown";
import { loadChat, saveChat } from "@/lib/chat-cache";
import { useCredits } from "@/components/providers/credits-provider";

interface FollowUpSectionProps {
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  description: string;
  /** Fuller on-page context (ingredients, method, why it works, inside tip). */
  context?: string;
  allowedDomains?: string[];
  savedQuestions?: string[] | null;
}

// Module-level default so the prop reference is stable across renders (keeps the
// memoized chat transport from being recreated when the parent omits it).
const DEFAULT_ALLOWED_DOMAINS = [
  "healthline.com",
  "webmd.com",
  "nhs.uk",
  "mayoclinic.org",
];

export function FollowUpSection({
  contextId,
  contextType,
  title,
  description,
  context,
  allowedDomains = DEFAULT_ALLOWED_DOMAINS,
  savedQuestions,
}: FollowUpSectionProps) {
  const [questions, setQuestions] = useState<string[]>(
    savedQuestions?.length ? savedQuestions : []
  );

  const [questionsLoading, setQuestionsLoading] = useState(
    !savedQuestions?.length
  );

  const [input, setInput] = useState("");

  const { openTokenWall, refresh: refreshCredits } = useCredits();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const interceptFetch = useCallback(
    async (
      reqInput: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1]
    ) => {
      const res = await fetch(reqInput, init);
      if (res.status === 401) {
        // Guest (normally caught upstream by AuthGate) → sign-in modal.
        setSignInOpen(true);
      } else if (res.status === 403) {
        // Out of free chat replies → Get Nuko+.
        setPaywallOpen(true);
      } else if (res.status === 402) {
        res
          .clone()
          .json()
          .then((b) => {
            void refreshCredits();
          })
          .catch(() => {});
        openTokenWall();
      } else if (res.ok) {
        // Meter lands server-side when the stream finishes; refresh shortly after.
        setTimeout(() => refreshCredits(), 1500);
      }
      return res;
    },
    [openTokenWall, refreshCredits]
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/rag/chat",
        fetch: interceptFetch,
        body: {
          contextId,
          contextType,
          title,
          allowedDomains,
          description,
          context,
        },
      }),
    [
      interceptFetch,
      contextId,
      contextType,
      title,
      allowedDomains,
      description,
      context,
    ]
  );

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  // Restore any persisted conversation for this recipe on mount / id change.
  useEffect(() => {
    const cached = loadChat(contextId);
    if (cached) setMessages(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId]);

  // Persist completed turns so the chat survives navigation (cleared on logout).
  useEffect(() => {
    if (status === "ready") saveChat(contextId, messages);
  }, [status, messages, contextId]);

  useEffect(() => {
    if (savedQuestions?.length) return;

    let cancelled = false;
    setQuestionsLoading(true);

    fetch("/api/rag/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextId,
        contextType,
        title,
        description,
        context,
      }),
    })
      .then((r) => r.json())
      .then(({ questions: aiQs }) => {
        if (!cancelled && Array.isArray(aiQs) && aiQs.length > 0) {
          setQuestions(aiQs);
          fetch("/api/rag/save-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contextId, contextType, questions: aiQs }),
          }).catch(() => {
            /* non-critical, fail silently */
          });
        }
      })
      .catch(() => {
        /* keep static fallback silently */
      })
      .finally(() => {
        if (!cancelled) setQuestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contextId]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    sendMessage({ text: input });
    // sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  const handleSelectQuestion = (question: string) => {
    if (isLoading) return;
    sendMessage({ text: question });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        Follow Up Questions
      </h2>

      <QuestionsList
        questions={questions}
        loading={questionsLoading}
        onSelect={handleSelectQuestion}
      />

      {messages.length > 0 && (
        <ChatThread messages={messages} isLoading={isLoading} />
      )}

      <ChatInput
        input={input}
        isLoading={isLoading}
        onChange={setInput}
        onSend={handleSend}
      />

      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}

      {/* Opens in place on this recipe page (no navigation) — closing just
          dismisses it and stays put. */}
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </div>
  );
}

interface QuestionsListProps {
  questions: string[];
  loading: boolean;
  onSelect: (q: string) => void;
}

function QuestionsList({ questions, loading, onSelect }: QuestionsListProps) {
  return (
    <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-white">
      <CardContent className="p-0">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                {i > 0 && (
                  <Separator
                    className="bg-border mx-4"
                    style={{ width: "calc(100% - 32px)" }}
                  />
                )}
                <div className="px-5 min-h-14 flex items-center">
                  <div className="h-4 bg-muted rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ))
          : questions.map((q, i) => (
              <div key={i}>
                {i > 0 && (
                  <Separator
                    className="bg-border mx-4"
                    style={{ width: "calc(100% - 32px)" }}
                  />
                )}
                <button
                  onClick={() => onSelect(q)}
                  className="w-full flex items-center justify-between px-5 min-h-14 py-3 text-left hover:opacity-75 transition-opacity active:scale-[0.98]"
                >
                  <span className="text-subtle font-medium leading-snug pr-4">
                    {q}
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </button>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

interface ChatThreadProps {
  messages: UIMessage[];
  isLoading: boolean;
}

function ChatThread({ messages, isLoading }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    const count = messages.length;
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    if (prev === null) return; // initial/restored set → don't scroll
    if (count > prev || isLoading) {
      // new message, or actively streaming
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const lastMsg = messages[messages.length - 1];

  const awaitingFirstToken =
    isLoading &&
    (lastMsg?.role === "user" ||
      (lastMsg?.role === "assistant" &&
        !lastMsg.parts?.some(
          (p) => p.type === "text" || p.type === "tool-webSearch"
        )));

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        if (m.role === "assistant" && isLoading && !m.parts?.length) {
          return null;
        }

        const isCurrentMessage =
          isLoading && m === messages[messages.length - 1];

        return (
          <div
            key={m.id}
            className={cn(
              "flex gap-3",
              m.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {m.role === "assistant" && <NuraAvatar />}

            <div
              className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl text-base leading-relaxed",
                m.role === "user"
                  ? "bg-foreground text-background rounded-br-sm"
                  : "bg-card text-foreground rounded-bl-sm"
              )}
            >
              {m.role === "user" ? (
                <span>
                  {m.parts?.find((p) => p.type === "text")?.text ?? ""}
                </span>
              ) : (
                (() => {
                  const hasActiveTool =
                    isCurrentMessage &&
                    m.parts?.some(
                      (p) =>
                        p.type === "tool-webSearch" &&
                        p.state !== "output-available"
                    );

                  const textParts =
                    m.parts?.filter((p) => p.type === "text") ?? [];
                  const finalText = textParts[textParts.length - 1];

                  const betweenToolAndText =
                    isCurrentMessage && !hasActiveTool && !finalText;

                  return (
                    <>
                      {(hasActiveTool || betweenToolAndText) && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {/* Searching trusted sources… */}
                        </div>
                      )}

                      {finalText ? (
                        <span>{stripMarkdown(finalText.text)}</span>
                      ) : !isLoading ? (
                        <span className="text-sm text-muted-foreground">
                          Nuko couldn't generate a response. Please try asking a
                          different question or check back later.
                        </span>
                      ) : null}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        );
      })}

      {awaitingFirstToken && (
        <div className="flex gap-3 justify-start">
          <NuraAvatar />
          <div className="bg-card px-4 py-3.5 rounded-2xl rounded-bl-sm">
            <TypingDots />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
// ─── ChatInput ─────────────────────────────────────────────────────────────────

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
}

function ChatInput({ input, isLoading, onChange, onSend }: ChatInputProps) {
  return (
    <Card className="border-0 rounded-3xl shadow-none bg-white">
      <CardContent className="px-4">
        <p className="text-sm font-semibold mb-2 text-[#1B1D1D]">
          Ask a follow-up question
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder="Type your question..."
              disabled={isLoading}
              className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>
          <Button
            size="icon"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="size-10 rounded-full bg-foreground hover:bg-foreground/85 text-background shrink-0 shadow-none border-0 disabled:opacity-40"
            aria-label="Send question"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Shared primitives ─────────────────────────────────────────────────────────

function NuraAvatar() {
  return (
    <div
      className="size-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
    >
      <svg
        width="17"
        height="20"
        viewBox="0 0 17 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.70075 0.0232811C7.47022 -0.0737985 8.2851 0.13107 8.85744 0.669091C9.2472 1.04244 9.50628 1.53148 9.5962 2.06367C9.91827 3.8637 8.64042 4.92467 7.98792 6.41275C7.63292 7.22236 7.49014 8.10444 7.51626 8.98344C7.55329 10.2304 7.91548 11.506 8.48845 12.611C8.65723 12.9388 8.82285 13.2837 9.09956 13.5372C10.049 14.4067 10.8437 13.0228 11.4073 12.4254C12.2269 11.5566 13.3537 10.9921 14.5523 10.9455C15.2263 10.9193 15.9539 11.131 16.4512 11.5969C17.1801 12.2694 17.1828 13.5928 16.4891 14.2904C15.7089 15.075 14.5281 15.009 13.5056 14.9888C12.3127 14.9652 11.2045 15.3498 10.3697 16.224C9.29357 17.3547 9.03339 18.4794 9.04674 19.9839C8.3353 20.0145 7.49559 19.9926 6.77294 19.9894C6.76111 19.9777 6.74929 19.9662 6.73746 19.9545C6.70695 19.5488 6.75265 18.9792 6.70265 18.5885C6.64594 18.1277 6.46344 17.6917 6.17515 17.328C4.84468 15.6598 2.53634 16.9943 0.906826 15.6615C-0.581747 14.4441 -0.210089 12.1974 1.81878 12.0048C3.39456 11.8552 4.84157 12.9287 5.64482 14.2103C5.9604 14.7137 6.38022 15.8516 7.14555 15.7708C8.03123 15.587 7.84409 14.1701 7.59505 13.6077C6.38106 10.8661 3.67642 9.38244 3.14028 6.2147C2.73939 3.84612 4.10336 0.457723 6.70075 0.0232811Z"
          fill="#50443B"
        />
        <path
          d="M13.547 4.24373C14.9362 4.09099 16.185 5.09657 16.3325 6.48662C16.4799 7.87666 15.4696 9.12176 14.0791 9.26375C12.6963 9.40493 11.4596 8.40124 11.3131 7.01879C11.1666 5.63631 12.1654 4.39562 13.547 4.24373Z"
          fill="#50443B"
        />
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
