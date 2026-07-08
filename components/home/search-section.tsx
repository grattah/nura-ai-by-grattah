"use client";

import { useState, useCallback, useTransition } from "react";
import { Search, Mic, SendHorizontal, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { saveRecentSearch } from "@/components/search/edit-search-sheet";
import { logSearch } from "@/actions/log-search";
import { COMMON_CONCERNS } from "@/constants";
import { SearchLoading } from "@/components/search/search-loading";

interface CommonConcerns {
  searchers: number;
  term: string;
}

export function SearchSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Navigate inside a transition so the current (home) UI stays mounted while
  // /personalized-search loads — the loader shows over the blurred homepage.
  const [isRouteLoading, startTransition] = useTransition();

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || isRouteLoading) return;

    saveRecentSearch(trimmed);
    void logSearch(trimmed);
    startTransition(() => {
      router.push(`/personalized-search?q=${encodeURIComponent(trimmed)}`);
    });
  }, [query, router, isRouteLoading]);

  const handleCommonConcerns = (concern: string) => {
    setQuery(concern);
  };

  return (
    <>
      {isRouteLoading && <SearchLoading />}

      <div className="space-y-3 z-10 relative">
        {/* Input row */}
        <div
          style={{
            border: query ? "1px solid var(--mint-green)" : "none",
          }}
          className="flex items-center gap-3 bg-card rounded-xl px-3 h-sb shadow-[0_4px_16px_2px_#0000000F]"
        >
          <Search
            className="size-4 text-muted-foreground shrink-0"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Bloating, constipation, low energy, hormon..."
            className="flex-1 bg-transparent text-base text-base-text outline-none placeholder:text-muted-2"
          />

          {/* {query.trim() ? ( */}
          <button
            onClick={handleSubmit}
            disabled={isRouteLoading}
            className={`size-7 rounded-full flex items-center justify-center shrink-0 disabled:opacity-70 ${
              query.length === 0 ? "opacity-50" : ""
            }`}
            style={{ backgroundColor: "var(--mint-green)" }}
            aria-label="Search"
          >
            {isRouteLoading ? (
              <Loader2 className="size-4 text-white animate-spin" />
            ) : (
              <SendHorizontal className="size-4 text-white" />
            )}
          </button>
        </div>

        {/* Common concerns */}
        <div>
          <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-3 mt-6">
            Common Concerns
          </p>
          <div className="flex gap-2">
            {COMMON_CONCERNS.map((concern) => (
              <button
                key={concern}
                onClick={() => handleCommonConcerns(concern)}
                className="px-5 py-2.5 w-full rounded-full bg-badge text-sm text-foreground border border-badge-border hover:opacity-75 transition-opacity active:scale-95"
              >
                {concern}
              </button>
            ))}
          </div>
          {/* {concernsLoading ? (
            <ConcernsSkeleton />
          ) : commonConcerns.length > 0 ? (
            <div className="flex flex-wrap gap-2 mx-3">
              {commonConcerns.map((concern) => (
                <button
                  key={concern.term}
                  onClick={() => handleBadgeClick(concern.term)}
                  className="px-6 py-2.5 rounded-full bg-badge text-sm text-base-text border border-badge-border hover:opacity-75 transition-opacity active:scale-95 capitalize"
                >
                  {concern.term}
                </button>
              ))}
            </div>
          ) : null} */}
        </div>
      </div>
    </>
  );
}
