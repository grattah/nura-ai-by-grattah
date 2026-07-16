import Link from "next/link";

interface DetoxCardProps {
  /** The recipe's Base Nutrition Score (final_score, 0–100). Card hides if null. */
  finalScore?: number | null;
}

export function DetoxCard({ finalScore }: DetoxCardProps) {
  if (finalScore == null) return null;

  const pct = Math.max(0, Math.min(100, Math.round(finalScore)));

  // Ring geometry
  const size = 82;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-3xl bg-white p-4 flex items-start gap-4">
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

      <div className="flex flex-col gap-3.5">
        <div className="flex-1 flex flex-col gap-2">
          <p className="text-base text-black">
            This recipe is <span>{pct}% healthy</span> for a normal, healthy
            person.
          </p>
          <p className="text-sm text-subtle">
            For personalized suitability, please complete your health profile.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm py-2 pr-3 pl-2 bg-[#F3F1E8] rounded-full self-end w-fit"
        >
          Complete health profile →
        </Link>
      </div>
    </div>
  );
}
