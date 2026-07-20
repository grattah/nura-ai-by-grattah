"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Scores a freshly generated recipe on first view. Generated recipes are created
 * unscored (no bioactivities/categories/nutrition score); this fires an awaited
 * POST to `/api/recipes/[id]/score` once, then refreshes so the server-rendered
 * supports card, category badge and nutrition ring appear. Mirrors the lazy
 * hero-image trigger. Renders a placeholder only while scoring is in flight.
 */
export function RecipeScoreTrigger({
  recipeId,
  canTrigger,
}: {
  recipeId: string;
  canTrigger: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(canTrigger);
  const triggered = useRef(false);

  useEffect(() => {
    // Fire exactly once. The ref survives Strict Mode's setup→cleanup→setup, so
    // we don't gate the result on a per-effect cancelled flag.
    if (!canTrigger || triggered.current) return;
    triggered.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}/score`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("score request failed");
        // Re-render the server components with the newly written scores.
        router.refresh();
      } catch {
        setPending(false);
      }
    })();
  }, [recipeId, canTrigger, router]);

  if (!canTrigger || !pending) return null;

  return (
    <div className="rounded-3xl bg-white p-4 flex items-center gap-3">
      <div className="size-5 rounded-full border-2 border-mint-green border-t-transparent animate-spin shrink-0" />
      <p className="text-sm text-subtle">Calculating your recipe scores…</p>
    </div>
  );
}
