"use client";

import { useState, useRef } from "react";
import { ChevronRight, Sparkles, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { defaultFollowUpQuestions } from "@/lib/nura-dummy-data";

interface FollowUpSectionProps {
  questions?: string[];
}

export function FollowUpSection({
  questions = defaultFollowUpQuestions,
}: FollowUpSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleQuestionClick = (q: string) => {
    setInputValue(q);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // TODO: wire up RAG pipeline / SSE stream
    setInputValue("");
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        Follow Up Questions
      </h2>

      {/* Questions list */}
      <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card">
        <CardContent className="p-0">
          {questions.map((q, i) => (
            <div key={i}>
              {i > 0 && (
                <Separator
                  className="bg-border mx-4"
                  style={{ width: "calc(100% - 32px)" }}
                />
              )}
              <button
                onClick={() => handleQuestionClick(q)}
                // min-h-[56px] — generous tap target for older users
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

      {/* Chat input */}
      <Card className="border-0 rounded-3xl shadow-none bg-card">
        <CardContent className="px-4 py-3.5">
          <p className="text-sm font-semibold text-muted-foreground mb-2">
            Ask a follow-up
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your question..."
                className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
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
              onClick={handleSend}
              className="w-11 h-11 rounded-full bg-foreground hover:bg-foreground/85 text-background shrink-0 shadow-none border-0"
              aria-label="Send question"
            >
              <Send className="w-4 h-4 rotate-[-30deg]" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
