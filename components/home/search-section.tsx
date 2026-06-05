"use client";

import { useState, useRef, useCallback } from "react";
import { Search, Mic, SendHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/hooks/use-access";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { saveRecentSearch } from "@/components/search/edit-search-sheet";

const COMMON_CONCERNS = [
  "Bloating",
  "Indigestion",
  "Heartburn",
  "Stress",
  "Fatigue",
  "Sleep",
];

// Minimal interface — only what we actually call on the recognition instance
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

export function SearchSection() {
  const { hasAccess, isLoading } = useAccess();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const requireAccess = useCallback(
    (cb: () => void) => {
      if (!isLoading && !hasAccess) {
        setPaywallOpen(true);
        return;
      }
      cb();
    },
    [hasAccess, isLoading],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    requireAccess(() => {
      saveRecentSearch(trimmed);
      router.push(`/personalized-search?q=${encodeURIComponent(trimmed)}`);
    });
  }, [query, requireAccess, router]);

  const handleFocus = useCallback(() => {
    if (!isLoading && !hasAccess) {
      setPaywallOpen(true);
    }
  }, [hasAccess, isLoading]);

  const handleBadgeClick = useCallback(
    (concern: string) => {
      requireAccess(() => setQuery(concern));
    },
    [requireAccess],
  );

  const handleMic = useCallback(() => {
    requireAccess(() => {
      const w = window as unknown as Record<string, unknown>;
      const RecognitionClass = (w.SpeechRecognition ??
        w.webkitSpeechRecognition) as
        | (new () => SpeechRecognitionLike)
        | undefined;

      if (!RecognitionClass) return;

      // Toggle off if already recording
      if (isRecording) {
        recognitionRef.current?.stop();
        return;
      }

      const recognition = new RecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        setQuery((prev) =>
          prev.trim() ? `${prev.trim()} ${transcript}` : transcript,
        );
      };

      recognition.onend = () => setIsRecording(false);
      // onerror fires when mic is denied — silently stop; user can retry
      recognition.onerror = () => setIsRecording(false);

      try {
        recognition.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    });
  }, [isRecording, requireAccess]);

  return (
    <>
      <div className="space-y-3">
        {/* Input row */}
        <div
          style={{
            border: query ? "1px solid var(--mint-green)" : "none",
          }}
          className="flex items-center gap-3 bg-card rounded-[12px] px-3 h-11.25 shadow-none"
        >
          <Search
            className="w-4 h-4 text-muted-foreground shrink-0"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Bloating, constipation, low energy, hor..."
            className="flex-1 bg-transparent text-base text-base-text outline-none placeholder:text-muted-2"
          />

          {query.trim() ? (
            <button
              onClick={handleSubmit}
              className="size-7 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "var(--mint-green)" }}
              aria-label="Search"
            >
              <SendHorizontal className="size-4 text-white" />
            </button>
          ) : (
            <button
              onClick={handleMic}
              aria-label={isRecording ? "Stop recording" : "Voice search"}
              className="shrink-0"
            >
              <Mic
                className={`size-4 text-mint-green ${isRecording ? "animate-pulse" : ""}`}
                strokeWidth={1.75}
              />
            </button>
          )}
        </div>

        {/* Common concerns */}
        <div>
          <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-3">
            Common Concerns
          </p>
          <div className="flex flex-wrap gap-2 mx-3">
            {COMMON_CONCERNS.map((concern) => (
              <button
                key={concern}
                onClick={() => handleBadgeClick(concern)}
                className="px-6 py-2.5 rounded-full bg-badge text-sm text-foreground border border-badge-border hover:opacity-75 transition-opacity active:scale-95"
              >
                {concern}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
