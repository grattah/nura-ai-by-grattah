"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Heart,
  Info,
  Sparkles,
} from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { useCredits } from "@/components/providers/credits-provider";
import PersonalizedTokenModal from "@/components/tokens/PersonalizedTokenModal";
import { EditSearchSheet } from "@/components/search/edit-search-sheet";
import type { PersonalizedSearchResult } from "@/app/api/personalized-search/route";
import Cup from "@/components/vectors/cup";

// v2: bumped when the result shape was flattened — invalidates old object-shaped
// cached results so they don't render with undefined fields.
const CACHE_PREFIX = "nura_search_cache_v2_";

function normalizeKey(q: string) {
  return `${CACHE_PREFIX}${q.trim().toLowerCase()}`;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function LoadingModal({
  title = "Preparing your answer...",
  message = "Please hold on while we find the best answer for you",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        role="status"
        aria-live="polite"
        className="relative w-full max-w-sm rounded-3xl bg-white px-8 py-10 flex flex-col items-center text-center gap-6 shadow-xl"
      >
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg
            className="absolute inset-0 animate-spin"
            viewBox="0 0 100 100"
            style={{ animationDuration: "1.5s" }}
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#227B6F"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="100 283"
            />
          </svg>
          <div className="w-20 h-20 rounded-full bg-linear-to-b from-[#F3EBD3] to-[#F8F5EE] flex items-center justify-center">
            <Sparkles size={28} color="#227B6F" strokeWidth={2} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg max-xs:text-sm font-semibold text-[#333333]">
            {title}
          </h2>
          <p className="text-subtle max-w-xs text-center">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main content ──────────────────────────────────────────────────────────────

function PersonalizedSearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const { hasAccess, isLoading: accessLoading } = useAccess();
  const { applyState, openTokenWall, refresh: refreshCredits } = useCredits();
  const [result, setResult] = useState<PersonalizedSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(
    null,
  );

  const fetchResult = useCallback(async (q: string) => {
    const cacheKey = normalizeKey(q);

    // Cache hit — render instantly
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setResult(JSON.parse(cached));
        setLoading(false);
        return;
      }
    } catch {}

    // Cache miss — fetch from API
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/personalized-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.status === 402) {
        const body = await res.json().catch(() => ({}));
        if (body.state) applyState(body.state);
        openTokenWall();
        setError("You're out of tokens. Top up to keep searching.");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data: PersonalizedSearchResult = await res.json();
      setResult(data);
      refreshCredits();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {}
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [applyState, openTokenWall, refreshCredits]);

  // Render a cached result instantly, independent of the access check —
  // no need to wait on the (potentially slow) subscription lookup just to
  // show data we already have on this device.
  useEffect(() => {
    if (!query) return;
    try {
      const cached = localStorage.getItem(normalizeKey(query));
      if (cached) {
        setResult(JSON.parse(cached));
        setLoading(false);
      }
    } catch {}
  }, [query]);

  useEffect(() => {
    if (accessLoading) return;
    if (!hasAccess) {
      router.replace("/");
      return;
    }
    if (!query) {
      router.replace("/");
      return;
    }
    fetchResult(query);
  }, [query, hasAccess, accessLoading, router, fetchResult]);

  if (!result && (accessLoading || loading)) return <LoadingModal />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 max-xs:px-4">
        <p className="text-muted-foreground text-center text-sm max-xs:text-xs">
          {error}
        </p>
        <button
          onClick={() => router.back()}
          className="text-sm max-xs:text-xs font-semibold underline underline-offset-4"
          style={{ color: "var(--mint-green)" }}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <>
      <div className="bg-background pb-8">
        {/* Sub-header */}
        <div className="px-6 max-xs:px-4 pt-5 pb-4 flex items-center gap-3 relative">
          <button
            onClick={() => router.back()}
            className="size-10 max-xs:size-7 bg-badge absolute left-6 max-xs:left-4 rounded-full flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5 max-xs:size-3 text-grey-c900" />
          </button>
          <div className="flex-1 text-center space-y-1.5">
            <p className="text-lg max-xs:text-sm font-semibold text-base-text">
              Wellness support 🌿
            </p>
            <p className="text-sm max-xs:text-xs text-subtle font-medium">
              Personalized for you
            </p>
          </div>
        </div>

        <div className="px-6 max-xs:px-4 space-y-10">
          {/* Query row */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl max-xs:rounded-lg p-4 max-xs:p-3 border border-[#E3E1D880] flex items-center justify-between gap-3">
              <div className="flex items-center gap-x-3 min-w-0 flex-1">
                <span className="text-xl max-xs:text-base shrink-0">🌿</span>
                <div className="space-y-1">
                  <p className="text-sm max-xs:text-xs text-muted-foreground shrink-0">
                    You shared:
                  </p>
                  <p className="text-sm max-xs:text-xs font-medium text-foreground line-clamp-2">
                    {query}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="text-sm max-xs:text-xs font-semibold shrink-0 hover:opacity-75 transition-opacity"
                style={{ color: "var(--mint-green)" }}
              >
                Edit
              </button>
            </div>

            {/* AI summary */}
            <div className="bg-white rounded-2xl max-xs:rounded-lg border-[#E3E1D880] p-4 max-xs:p-3 flex gap-3 items-start">
              <div className="size-12 max-xs:size-8 bg-mint-green rounded-full flex items-center justify-center shrink-0">
                <Image
                  src="/logo-outlined-nobg.svg"
                  alt="Logo"
                  width={26}
                  height={24}
                  className="object-contain max-xs:size-5"
                />
              </div>
              <p className="text-base max-xs:text-xs font-medium text-subtle leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* what to try */}
            <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 flex flex-col gap-y-2">
              <div className="flex-1 flex items-center justify-between gap-3">
                <p className="text-base max-xs:text-sm font-medium text-base-text">
                  {result.whatToTryTitle}
                </p>
                <div className="shrink-0">
                  <Info
                    strokeWidth={2}
                    className="size-5 max-xs:size-4 text-mint-green"
                  />
                </div>
              </div>
              <p className="text-sm max-xs:text-xs text-base-text">
                {result.whatToTryDescription}
              </p>
            </div>
          </div>

          {/* Why this works */}
          {result.whyItWorks.length > 0 && (
            <section>
              <div className="space-y-3 mb-3">
                <h2 className="text-xl max-xs:text-base font-medium text-base-text">
                  Why these suggestions?
                </h2>
                <p className="text-subtle max-xs:text-xs leading-snug">
                  These recipes contain ingredients that work together to
                  support your body:
                </p>
              </div>
              <div className="space-y-3">
                {result.whyItWorks.map((point, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <CheckCircle2
                      className="size-4.5 max-xs:size-3 shrink-0 mt-1"
                      style={{ color: "var(--mint-green)" }}
                      strokeWidth={2}
                    />
                    <p className="text-base max-xs:text-xs text-subtle leading-snug">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Drinks to try */}
          {result.drinksToTry.length > 0 && (
            <section>
              <h2 className="text-xl max-xs:text-base font-medium text-base-text mb-3">
                Recipes that can help 🌿
              </h2>
              <div className="bg-white border border-grey-c100 rounded-2xl max-xs:rounded-lg overflow-hidden">
                {result.drinksToTry.map((drink, i) => (
                  <div key={i}>
                    {i > 0 && (
                      <div className="h-px bg-black/10 mx-17 max-xs:mx-12.5" />
                    )}
                    <Link
                      href={`/find-recipe?generate=${encodeURIComponent(drink)}&concern=${encodeURIComponent(query)}`}
                      className="flex items-center justify-between max-xs:px-3 max-xs:py-2.5 px-4 py-3.5 hover:opacity-75 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="size-9 max-xs:size-6 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "oklch(0.9699 0.0127 190.96)",
                          }}
                        >
                          <Cup className="max-xs:size-3" />
                        </div>
                        <span className="text-base max-xs:text-xs font-medium text-subtle">
                          {drink}
                        </span>
                      </div>
                      <ChevronRight className="size-4 max-xs:size-3 text-grey-c700 shrink-0" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Try these too */}
          {result.tryTheseToo.length > 0 && (
            <section>
              <h2 className="text-xl max-xs:text-base font-medium text-base-text mb-3">
                Other that can also help 🌿
              </h2>
              <div className="space-y-2">
                {result.tryTheseToo.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#E3E1D880] max-xs:rounded-lg rounded-2xl p-4 max-xs:p-3 flex gap-3 items-start"
                  >
                    <div
                      className="size-12 max-xs:size-6 max-xs:text-xs rounded-full flex items-center justify-center shrink-0 text-2xl"
                      style={{ backgroundColor: "#5C6B3A22" }}
                    >
                      🌿
                    </div>
                    <div className="min-w-0">
                      <p className="text-base max-xs:text-sm font-medium text-base-text leading-snug">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important note */}
          <div className="bg-success-c100 max-xs:rounded-lg rounded-2xl border border-[#C4CAC8] p-4 max-xs:p-3 space-y-2.5">
            <p className="text-base max-xs:text-sm font-medium text-base-text">
              Important note
            </p>
            <div className="flex items-start gap-x-5">
              <p className="text-sm max-xs:text-xs text-subtle flex-1">
                This is general wellness guidance, not medical advice. If
                symptoms persist or worsen, please consult a healthcare
                professional.
              </p>
              <div className="shrink-0">
                <Heart
                  strokeWidth={2.67}
                  className="size-7 max-xs:size-4 text-success-c600"
                />
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white max-xs:rounded-lg rounded-2xl border border-[#E3E1D880] p-4 max-xs:p-3 space-y-3">
            <div>
              <p className="text-base max-xs:text-sm font-medium text-base-text">
                How was this helpful?
              </p>
              <p className="text-sm max-xs:text-xs text-subtle -mt-0.5 max-xs:mt-0.5">
                Your feedback helps us improve
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setFeedback("helpful")}
                className={`flex w-full justify-center items-center gap-2 px-4 max-2xs:px-3 py-3 max-xs:py-2 rounded-full border border-grey-c300 text-sm max-xs:text-xs max-2xs:text-xs transition-opacity active:scale-95 ${
                  feedback === "helpful"
                    ? "border-mint-green text-mint-green font-semibold"
                    : "border-border text-foreground hover:opacity-75"
                }`}
              >
                <ThumbsUp className="size-4 max-xs:size-3" strokeWidth={1.5} />
                Helpful
              </button>
              <button
                onClick={() => setFeedback("not_helpful")}
                className={`flex w-full justify-center items-center gap-2 px-4 max-2xs:px-3 py-3 max-xs:py-2 rounded-full border border-grey-c300 text-sm max-xs:text-xs max-2xs:text-xs transition-opacity active:scale-95 ${
                  feedback === "not_helpful"
                    ? "border-destructive text-destructive font-semibold"
                    : "border-border text-foreground hover:opacity-75"
                }`}
              >
                <ThumbsDown
                  className="size-4 max-xs:size-3"
                  strokeWidth={1.5}
                />
                Not helpful
              </button>
            </div>
          </div>

          {/* Almost-out warning (subscribers near their weekly limit) */}
          <PersonalizedTokenModal />
        </div>
      </div>

      <EditSearchSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        currentQuery={query}
      />

      {/* Regenerating after an edit: overlay the "Preparing your answer" modal
          over the (now blurred) stale content until the new answer is ready. */}
      {loading && <LoadingModal />}
    </>
  );
}

// Suspense boundary required by Next.js for useSearchParams()
export default function PersonalizedSearchPage() {
  return (
    <Suspense fallback={<LoadingModal />}>
      <PersonalizedSearchContent />
    </Suspense>
  );
}
