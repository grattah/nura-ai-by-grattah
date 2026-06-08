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
} from "lucide-react";
import { useAccess } from "@/hooks/use-access";
import { EditSearchSheet } from "@/components/search/edit-search-sheet";
import type { PersonalizedSearchResult } from "@/app/api/personalized-search/route";
import Cup from "@/components/vectors/cup";

const CACHE_PREFIX = "nura_search_cache_";

function normalizeKey(q: string) {
  return `${CACHE_PREFIX}${q.trim().toLowerCase()}`;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 pt-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex-1 text-center space-y-1.5">
          <div className="h-4 bg-muted rounded-full animate-pulse w-32 mx-auto" />
          <div className="h-3 bg-muted rounded-full animate-pulse w-20 mx-auto" />
        </div>
        <div className="w-9 shrink-0" />
      </div>
      <div className="h-14 bg-muted rounded-2xl animate-pulse" />
      <div className="h-24 bg-muted rounded-2xl animate-pulse" />
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded-full animate-pulse w-36" />
        <div className="h-40 bg-muted rounded-2xl animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded-full animate-pulse w-28" />
        <div className="h-48 bg-muted rounded-2xl animate-pulse" />
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
      if (!res.ok) throw new Error("Failed");
      const data: PersonalizedSearchResult = await res.json();
      setResult(data);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {}
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (accessLoading || (loading && !result)) return <SearchSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground text-center text-sm">{error}</p>
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold underline underline-offset-4"
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
        <div className="px-4 pt-5 pb-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="size-10 bg-badge rounded-full flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5 text-grey-c900" />
          </button>
          <div className="flex-1 text-center space-y-1.5">
            <p className="text-lg font-semibold text-base-text">
              Wellness support 🌿
            </p>
            <p className="text-sm text-subtle font-medium">
              Personalized for you
            </p>
          </div>
          <div className="w-9 shrink-0" aria-hidden />
        </div>

        <div className="px-4 space-y-10">
          {/* Query row */}
          <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 border border-[#E3E1D880] flex items-center justify-between gap-3">
              <div className="flex items-center gap-x-3 min-w-0 flex-1">
                <span className="text-xl shrink-0">🌿</span>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground shrink-0">
                    You shared:
                  </p>
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    {query}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="text-sm font-semibold shrink-0 hover:opacity-75 transition-opacity"
                style={{ color: "var(--mint-green)" }}
              >
                Edit
              </button>
            </div>

            {/* AI summary */}
            <div className="bg-card rounded-2xl border-[#E3E1D880] p-4 flex gap-3 items-start">
              <div className="size-12 bg-mint-green rounded-full flex items-center justify-center shrink-0">
                <Image
                  src="/logo-outlined-nobg.svg"
                  alt="Logo"
                  width={26}
                  height={24}
                  className="object-contain"
                />
              </div>
              <p className="text-base font-medium text-subtle leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* what to try */}
            <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 flex flex-col gap-y-2">
              <div className="flex-1 flex items-center justify-between gap-3">
                <p className="text-base font-medium text-base-text">
                  {result.whatToTry.title}
                </p>
                <div className="shrink-0">
                  <Info strokeWidth={2} className="size-5 text-mint-green" />
                </div>
              </div>
              <p className="text-sm text-base-text">
                {result.whatToTry.description}
              </p>
            </div>
          </div>

          {/* Drinks to try */}
          {result.drinksToTry.length > 0 && (
            <section>
              <h2 className="text-xl font-medium text-base-text mb-3">
                Recipes that can help 🌿
              </h2>
              <div className="bg-card rounded-2xl overflow-hidden">
                {result.drinksToTry.map((drink, i) => (
                  <div key={i}>
                    {i > 0 && <div className="h-px bg-black/10 mx-17" />}
                    <Link
                      href={`/recipes?q=${encodeURIComponent(drink.name)}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:opacity-75 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="size-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "oklch(0.9699 0.0127 190.96)",
                          }}
                        >
                          <Cup />
                        </div>
                        <span className="text-base font-medium text-subtle">
                          {drink.name}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-grey-c700 shrink-0" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Try these too */}
          {result.tryTheseToo.length > 0 && (
            <section>
              <h2 className="text-xl font-medium text-base-text mb-3">
                Other that can also help 🌿
              </h2>
              <div className="space-y-2">
                {result.tryTheseToo.map((item, i) => (
                  <div
                    key={i}
                    className="bg-card border border-[#E3E1D880] rounded-2xl p-4 flex gap-3 items-start"
                  >
                    <div
                      className="size-12 rounded-full flex items-center justify-center shrink-0 text-2xl"
                      style={{ backgroundColor: "#5C6B3A22" }}
                    >
                      🌿
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-base font-medium text-base-text">
                        {item.title}
                      </p>
                      <p className="text-sm text-subtle leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Why this works */}
          {result.whyItWorks.length > 0 && (
            <section>
              <div className="space-y-3 mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Why these suggestions?
                </h2>
                <p className="text-subtle leading-snug">
                  These recipes contain ingredients that work together to
                  support your body:
                </p>
              </div>
              <div className="space-y-3">
                {result.whyItWorks.map((point, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <CheckCircle2
                      className="size-4.5 shrink-0 mt-1"
                      style={{ color: "var(--mint-green)" }}
                      strokeWidth={2}
                    />
                    <p className="text-base text-subtle leading-snug">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important note */}
          <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 flex items-center justify-between">
            <div className="flex-1 space-y-2.5">
              <p className="text-base font-medium text-base-text">
                Important note
              </p>
              <p className="text-sm text-subtle">
                This is general wellness guidance, not medical advice. If
                symptoms persist or worsen, please consult a healthcare
                professional.
              </p>
            </div>
            <div className="shrink-0">
              <Heart strokeWidth={2.67} className="size-7 text-success-c600" />
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-card rounded-2xl border border-[#E3E1D880] p-4 space-y-3">
            <div>
              <p className="text-base font-medium text-base-text">
                How was this helpful?
              </p>
              <p className="text-sm text-subtle -mt-0.5">
                Your feedback helps us improve
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setFeedback("helpful")}
                className={`flex w-full justify-center items-center gap-2 px-4 py-3 rounded-full border border-grey-c300 text-sm transition-opacity active:scale-95 ${
                  feedback === "helpful"
                    ? "border-mint-green text-mint-green font-semibold"
                    : "border-border text-foreground hover:opacity-75"
                }`}
              >
                <ThumbsUp className="w-4 h-4" strokeWidth={1.5} />
                Helpful
              </button>
              <button
                onClick={() => setFeedback("not_helpful")}
                className={`flex w-full justify-center items-center gap-2 px-4 py-3 rounded-full border border-grey-c300 text-sm transition-opacity active:scale-95 ${
                  feedback === "not_helpful"
                    ? "border-destructive text-destructive font-semibold"
                    : "border-border text-foreground hover:opacity-75"
                }`}
              >
                <ThumbsDown className="w-4 h-4" strokeWidth={1.5} />
                Not helpful
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditSearchSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        currentQuery={query}
      />
    </>
  );
}

// Suspense boundary required by Next.js for useSearchParams()
export default function PersonalizedSearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <PersonalizedSearchContent />
    </Suspense>
  );
}
