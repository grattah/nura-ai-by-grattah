"use client";

import { useEffect, useState } from "react";
import type { SupportScore } from "@/lib/wellness-score";

interface AssignedSupport {
  name: string;
  slug: string;
}

interface DetoxCardProps {
  recipeId: string;
  supports: AssignedSupport[];
  initialScores?: SupportScore[] | null;
}

export function DetoxCard({
  recipeId,
  supports,
  initialScores,
}: DetoxCardProps) {
  const hasInitial = !!initialScores?.length;
  const [scores, setScores] = useState<SupportScore[]>(
    hasInitial ? initialScores! : [],
  );
  const [loading, setLoading] = useState(!hasInitial && supports.length > 0);

  useEffect(() => {
    if (hasInitial || supports.length === 0) return;

    let cancelled = false;
    setLoading(true);

    fetch("/api/recipes/support-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data?.scores)) setScores(data.scores);
      })
      .catch(() => {
        /* leave empty — card hides gracefully */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  // Nothing to show (no tags / failed and uncached) — render nothing.
  if (!loading && scores.length === 0) return null;

  const primary = scores[0];

  // Ring geometry
  const size = 82;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = primary?.score ?? 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-3xl bg-white p-4 flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#D6EFE2"
            strokeWidth={strokeWidth}
          />
          {!loading && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="#E6F4EB"
              stroke="#1BAB51"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {loading ? (
            <span className="h-6 w-10 rounded-full bg-muted animate-pulse" />
          ) : (
            <span className="text-2xl font-semibold text-[#19803F]">
              {pct}%
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-base text-black font-semibold">
          This recipe contains
        </p>
        {loading ? (
          <div className="h-4 w-3/4 rounded-full bg-muted animate-pulse" />
        ) : (
          <p className="text-base">
            {scores.map((s, i) => (
              <span key={s.slug}>
                <span
                  className={
                    i === 0 ? "text-mint-green font-semibold" : "text-subtle"
                  }
                >
                  {s.score}% {s.support}
                  {i === 0 ? " support" : ""}
                </span>
                {i < scores.length - 1
                  ? i === scores.length - 2
                    ? ", and "
                    : ", "
                  : "."}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
