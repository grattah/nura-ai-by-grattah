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
import { useCredits } from "@/components/providers/credits-provider";
import PersonalizedTokenModal from "@/components/tokens/PersonalizedTokenModal";
import { EditSearchSheet } from "@/components/search/edit-search-sheet";
import { UpgradeOverlay } from "@/components/paywall/upgrade-overlay";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { SearchLoading } from "@/components/search/search-loading";
import { PersonalizedSearchSkeleton } from "@/components/paywall/personalized-search-skeleton";
import { backOrHome } from "@/lib/navigation";
import type { PersonalizedSearchResult } from "@/app/api/personalized-search/route";
import Cup from "@/components/vectors/cup";

// v2: bumped when the result shape was flattened — invalidates old object-shaped
// cached results so they don't render with undefined fields.
const CACHE_PREFIX = "nura_search_cache_v2_";

function normalizeKey(q: string) {
  return `${CACHE_PREFIX}${q.trim().toLowerCase()}`;
}

// ─── Main content ──────────────────────────────────────────────────────────────

function PersonalizedSearchContent({
  serverBlocked,
}: {
  serverBlocked: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const {
    hasAccess,
    isLoading: accessLoading,
    hasEverSubscribed,
    isSubscriber,
    isAuthenticated,
  } = useAccess();
  // A new user in the free trial: a cached search still consumes one of their 2
  // uses (deduped by query), so they can't bypass the cap via the local cache.
  const isTrialUser = isAuthenticated && !isSubscriber && !hasEverSubscribed;
  const { applyState, openTokenWall, refresh: refreshCredits } = useCredits();
  const [result, setResult] = useState<PersonalizedSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // True when an authenticated user is out of free searches → lock overlay.
  // Seeded from the server so an out-of-searches user commits straight to the
  // overlay (no client fetch / loader flash).
  const [blocked, setBlocked] = useState(serverBlocked);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [feedback, setFeedback] = useState<"helpful" | "not_helpful" | null>(
    null,
  );

  const fetchResult = useCallback(
    async (q: string) => {
      const cacheKey = normalizeKey(q);

      // Cache hit — a cached result still counts against the free-trial cap for
      // new users (gate through the server, deduped by query), so the local
      // cache can't be used to bypass the "2 free searches" limit.
      let cached: string | null = null;
      try {
        cached = localStorage.getItem(cacheKey);
      } catch {}
      if (cached) {
        if (isTrialUser) {
          try {
            const res = await fetch("/api/free-trial/consume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                surface: "personalized_search",
                itemId: q.trim().toLowerCase(),
              }),
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok && body.allowed === false) {
              setBlocked(true);
              return;
            }
          } catch {
            // On error, don't block a result the user may be entitled to.
          }
        }
        setResult(JSON.parse(cached));
        setLoading(false);
        return;
      }

      // Cache miss — fetch from API
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/personalized-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        if (res.status === 403) {
          // Out of free searches → show the upgrade lock overlay.
          setBlocked(true);
          return;
        }
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
    },
    [applyState, openTokenWall, refreshCredits, router, isTrialUser],
  );

  useEffect(() => {
    // Already out of searches (server-decided or mid-session) → overlay only.
    if (blocked) return;
    if (accessLoading) return;
    // Guests are handled by RouteAuthGuard (sign-in overlay) — don't fetch.
    if (!isAuthenticated) return;
    if (!query) {
      router.replace("/");
      return;
    }
    // Lapsed subscriber (no access) → lock overlay directly; otherwise run the
    // search (a new user out of free uses gets a 403 → overlay in fetchResult).
    if (!hasAccess) {
      setBlocked(true);
      return;
    }
    fetchResult(query);
  }, [
    query,
    hasAccess,
    accessLoading,
    isAuthenticated,
    blocked,
    router,
    fetchResult,
  ]);

  // Guests: RouteAuthGuard overlays the sign-in modal; show a realistic (blurred)
  // result placeholder behind it rather than a blank screen.
  if (!accessLoading && !isAuthenticated) return <PersonalizedSearchSkeleton />;

  if (blocked) {
    return (
      <>
        <UpgradeOverlay onUpgrade={() => setPaywallOpen(true)} />
        <PaywallModal
          open={paywallOpen}
          onOpenChange={(o) => {
            setPaywallOpen(o);
            if (!o) backOrHome(router);
          }}
        />
      </>
    );
  }

  if (!result && (accessLoading || loading)) return <SearchLoading />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
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
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 relative">
          <button
            onClick={() => router.back()}
            className="size-10 bg-badge absolute left-6 rounded-full flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5 text-grey-c900" />
          </button>
          <div className="flex-1 text-center space-y-1.75">
            <p className="text-xl font-semibold text-base-text leading-none">
              Wellness support 🌿
            </p>
            <p className="text-sm text-subtle font-medium leading-none">
              Personalized for you
            </p>
          </div>
        </div>

        <div className="px-6 space-y-10">
          {/* Query row */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E3E1D880] flex items-center justify-between gap-3">
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
                className="text-sm font-semibold shrink-0 hover:opacity-75 transition-opacity text-mint-green"
              >
                Edit
              </button>
            </div>

            {/* AI summary */}
            <div className="bg-white rounded-2xl border-[#E3E1D880] p-4 flex gap-3 items-start">
              <div className="size-11 bg-mint-green rounded-full flex items-center justify-center shrink-0">
                <Image
                  src="/logo-outlined-nobg.svg"
                  alt="Logo"
                  width={26}
                  height={24}
                  className="object-contain size-7"
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
                  {result.whatToTryTitle}
                </p>
                <div className="shrink-0">
                  <Info strokeWidth={2} className="size-5 text-mint-green" />
                </div>
              </div>
              <p className="text-sm text-base-text">
                {result.whatToTryDescription}
              </p>
            </div>
          </div>

          {/* Why this works */}
          {result.whyItWorks.length > 0 && (
            <section className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-medium text-base-text">
                  Why these suggestions?
                </h2>
                <p className="text-subtle leading-tight text-base">
                  These recipes contain ingredients that work together to
                  support your body:
                </p>
              </div>
              <div className="space-y-3">
                {result.whyItWorks.map((point, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    {/* <CheckCircle2
                      className="size-4 shrink-0 mt-1"
                      style={{ color: "var(--mint-green)" }}
                      strokeWidth={2}
                    /> */}
                    <p className="text-base text-subtle leading-tight">
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
              <h2 className="text-xl font-medium text-base-text mb-3">
                Recipes that can help 🌿
              </h2>
              <div className="bg-white border border-grey-c100 rounded-2xl overflow-hidden">
                {result.drinksToTry.map((drink, i) => (
                  <div key={i}>
                    {i > 0 && (
                      <div className="h-px bg-black/10 mx-16" />
                    )}
                    <Link
                      href={`/find-recipe?generate=${encodeURIComponent(drink)}&concern=${encodeURIComponent(query)}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:opacity-75 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="size-9 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: "oklch(0.9699 0.0127 190.96)",
                          }}
                        >
                          <Cup className="size-5" />
                        </div>
                        <span className="text-base font-medium text-subtle">
                          {drink}
                        </span>
                      </div>
                      <ChevronRight className="size-4 text-grey-c700 shrink-0" />
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
                Others that can also help 🌿
              </h2>
              <div className="space-y-2">
                {result.tryTheseToo.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#E3E1D880] rounded-2xl p-4 flex gap-3 items-start"
                  >
                    <div
                      className="size-11 rounded-full flex items-center justify-center shrink-0 text-xl"
                      style={{ backgroundColor: "#5C6B3A22" }}
                    >
                      🌿
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-subtle leading-snug">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important note */}
          <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 space-y-2.5">
            <p className="text-base font-medium text-base-text">
              Important note
            </p>
            <div className="flex items-start gap-x-5">
              <p className="text-sm text-subtle flex-1">
                This is general wellness guidance, not medical advice. If
                symptoms persist or worsen, please consult a healthcare
                professional.
              </p>
              <div className="shrink-0">
                <Heart
                  strokeWidth={2.67}
                  className="size-7 text-success-c600"
                />
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white rounded-2xl border border-[#E3E1D880] p-4 space-y-3">
            <div>
              <p className="text-base font-medium text-base-text">
                How was this helpful?
              </p>
              <p className="text-sm text-subtle -mt-0.5 max-xs:mt-0.5">
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
                <ThumbsUp className="size-4" strokeWidth={1.5} />
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
                <ThumbsDown className="size-4" strokeWidth={1.5} />
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
      {loading && <SearchLoading />}
    </>
  );
}

// Suspense boundary required by Next.js for useSearchParams(). Out-of-searches
// users get the skeleton fallback (never the spinner), so the route can only
// ever resolve to the lock overlay — never a blank loader.
export function PersonalizedSearchClient({
  serverBlocked,
}: {
  serverBlocked: boolean;
}) {
  return (
    <Suspense
      fallback={
        serverBlocked ? <PersonalizedSearchSkeleton /> : <SearchLoading />
      }
    >
      <PersonalizedSearchContent serverBlocked={serverBlocked} />
    </Suspense>
  );
}
