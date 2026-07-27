"use client";

import { useEffect, useState } from "react";

export interface CardMatch {
  percent: number;
  label: string;
}

/**
 * Match Scores for a set of recipes (PRD §7.4). Listing/search pages are client
 * components without the scoring inputs, so they post their visible recipe ids
 * to /api/recipes/match-scores, which runs the same computeMatchScore the detail
 * page uses. Shared by every listing so they can't drift apart.
 *
 * Returns {} for guests, non-subscribers, and users with no conditions/goals —
 * callers render no badge in that case (PRD §8).
 */
export function useMatchScores(recipeIds: string[]): Record<string, CardMatch> {
  const [scores, setScores] = useState<Record<string, CardMatch>>({});
  // Stable dependency: refetch only when the actual set of ids changes, not on
  // every render that happens to produce a new array instance.
  const key = recipeIds.join(",");

  useEffect(() => {
    if (!key) {
      setScores({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/recipes/match-scores", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ recipeIds: key.split(",") }),
        });
        if (!res.ok) return; // 401 (guest) / 429 → simply no badges
        const data = (await res.json()) as { scores?: Record<string, CardMatch> };
        if (!cancelled) setScores(data.scores ?? {});
      } catch {
        /* offline or aborted — leave badges off */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return scores;
}
