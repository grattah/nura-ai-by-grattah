"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Generates the current user's personalized nutrition score + safety alerts on
 * first view (subscriber with a health profile), then refreshes so the server-
 * rendered card fills in. If the recipe isn't base-scored yet (freshly generated
 * via find-recipe), the endpoint replies `notReady` and this retries a few times
 * while the base-scoring trigger completes.
 */
export function RecipePersonalizeTrigger({
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
    if (!canTrigger || triggered.current) return;
    triggered.current = true;

    let attempts = 0;
    const run = async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}/personalize`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.personalized) {
          router.refresh();
          return;
        }
        if (res.ok && data?.notReady && attempts < 3) {
          attempts += 1;
          setTimeout(run, 2500);
          return;
        }
        setPending(false);
      } catch {
        setPending(false);
      }
    };
    run();
  }, [recipeId, canTrigger, router]);

  if (!canTrigger || !pending) return null;

  return (
    <div className="rounded-3xl bg-white p-4 flex items-center gap-3">
      <div className="size-5 rounded-full border-2 border-mint-green border-t-transparent animate-spin shrink-0" />
      <p className="text-sm text-subtle">Getting your match score…</p>
    </div>
  );
}
