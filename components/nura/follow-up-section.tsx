"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Sparkles, Send, Loader2, Bot } from "lucide-react";
// AI SDK 5: useChat moved to @ai-sdk/react. Import from "ai/react" is removed.
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { defaultFollowUpQuestions } from "@/lib/nura-dummy-data";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpSectionProps {
  contextId: string;
  contextType: "recipe" | "guide";
  title: string;
  description: string;
  allowedDomains?: string[];
  staticQuestions?: string[];
}

// ─── Root component ───────────────────────────────────────────────────────────

export function FollowUpSection({
  contextId,
  contextType,
  title,
  description,
  allowedDomains = ["healthline.com", "webmd.com", "nhs.uk", "mayoclinic.org"],
  staticQuestions = defaultFollowUpQuestions,
}: FollowUpSectionProps) {
  const [questions, setQuestions] = useState<string[]>(staticQuestions);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // AI SDK 5: useChat no longer manages input state.
  // We own it with a plain useState below.
  const [input, setInput] = useState("");

  // AI SDK 5: `body` is static — captured at first render only.
  // This is fine here: contextId/title/etc are page-level props that
  // never change during the component's lifecycle.

  // NOTE: AI SDK V4
  // const { messages, sendMessage, status } = useChat({
  //   api: "/api/rag/chat",
  //   body: { contextId, contextType, title, allowedDomains },
  // });

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/rag/chat",
      body: { contextId, contextType, title, allowedDomains },
    }),
  });

  // Derived loading flag from AI SDK 5's `status`
  // ('submitted' = waiting for first token, 'streaming' = tokens arriving)
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    let cancelled = false;
    setQuestionsLoading(true);

    fetch("/api/rag/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextId, contextType, title, description }),
    })
      .then((r) => r.json())
      .then(({ questions: aiQs }) => {
        if (!cancelled && Array.isArray(aiQs) && aiQs.length > 0) {
          setQuestions(aiQs);
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
    // AI SDK 5: sendMessage replaces handleSubmit/append.
    // Requires a structured message object with `text`.

    // NOTE: AI SDK V4
    // sendMessage({ role: "user", text:input });
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        Follow Up Questions
      </h2>

      <QuestionsList
        questions={questions}
        loading={questionsLoading}
        onSelect={(q) => {
          setInput(q);
        }}
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
    </div>
  );
}

// ─── QuestionsList ─────────────────────────────────────────────────────────────

interface QuestionsListProps {
  questions: string[];
  loading: boolean;
  onSelect: (q: string) => void;
}

function QuestionsList({ questions, loading, onSelect }: QuestionsListProps) {
  return (
    <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card">
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
                  <span className="text-base text-foreground/80 leading-snug pr-4">
                    {q}
                  </span>
                  <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground" />
                </button>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

// ─── ChatThread ────────────────────────────────────────────────────────────────

interface ChatThreadProps {
  messages: UIMessage[];
  isLoading: boolean;
}

function ChatThread({ messages, isLoading }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const awaitingFirstToken =
    isLoading && messages[messages.length - 1]?.role === "user";

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "flex gap-3",
            m.role === "user" ? "justify-end" : "justify-start",
          )}
        >
          {m.role === "assistant" && <NuraAvatar />}

          <div
            className={cn(
              "max-w-[85%] px-4 py-3 rounded-2xl text-base leading-relaxed",
              m.role === "user"
                ? "bg-foreground text-background rounded-br-sm"
                : "bg-card text-foreground rounded-bl-sm",
            )}
          >
            {/* AI SDK 5: render via m.parts — typed array per message.
                Text parts have type "text", tool parts have type "tool-{name}".
                Fall back to m.content for simple text-only cases. */}
            {m.parts && m.parts.length > 0
              ? m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <span key={i}>{part.text}</span>;
                  }
                  // Tool-call in progress — show inline indicator.
                  // In AI SDK 5, tool part type is "tool-webSearch".
                  // State is "input-streaming" | "input" | "output".
                  if (
                    part.type === "tool-webSearch" &&
                    part.state !== "output-available"
                  ) {
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Searching trusted sources…
                      </div>
                    );
                  }
                  return null;
                })
              : "Nura couldn't generate a response. Please try asking a different question or check back later."}
          </div>
        </div>
      ))}

      {/* Typing indicator — shows while waiting for first streamed token */}
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
    <Card className="border-0 rounded-3xl shadow-none bg-card">
      <CardContent className="px-4 py-3.5">
        <p className="text-sm font-semibold text-muted-foreground mb-2">
          Ask a follow-up
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
            <div className="flex items-center gap-1.5 mt-2">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Deep research on this topic
              </span>
            </div>
          </div>
          <Button
            size="icon"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 rounded-full bg-foreground hover:bg-foreground/85 text-background shrink-0 shadow-none border-0 disabled:opacity-40"
            aria-label="Send question"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 rotate-[-30deg]" />
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
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
      style={{ backgroundColor: "#5C6B3A" }}
    >
      <Bot className="w-4 h-4 text-white" />
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
