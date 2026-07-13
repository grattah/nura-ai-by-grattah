import { type SupportScore, MAX_SUPPORT_SCORES } from "@/lib/wellness-score";

interface DetoxCardProps {
  /** Precomputed bioactivity scores (from recipe_tags). Card hides if empty. */
  initialScores?: SupportScore[] | null;
}

export function DetoxCard({ initialScores }: DetoxCardProps) {
  const scores = initialScores ?? [];
  // Nothing scored yet (e.g. a freshly generated recipe) — render nothing.
  if (scores.length === 0) return null;

  // Each bioactivity keeps its own independent 0–100 strength (they don't sum to
  // 100). Sort strongest-first; the ring shows the top one's own score.
  const sorted = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUPPORT_SCORES);
  const primary = sorted[0];

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
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-[#19803F]">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-base text-black font-semibold">This recipe contains</p>
        <p className="text-base">
          {sorted.map((s, i) => (
            <span key={s.slug}>
              <span className="text-mint-green font-semibold">
                {s.score}% {s.support}
              </span>
              {i < sorted.length - 1
                ? i === sorted.length - 2
                  ? ", and "
                  : ", "
                : "."}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
