"use client";

interface DetoxCardProps {
  detoxPercent: number;
  hydrationPercent: number;
}

export function DetoxCard({ detoxPercent, hydrationPercent }: DetoxCardProps) {
  // Ring geometry
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (detoxPercent / 100) * circumference;

  return (
    <div className="rounded-2xl bg-white p-5 flex items-center gap-5">
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
          <span className="text-2xl font-semibold text-[#19803F]">
            {detoxPercent}%
          </span>
        </div>
      </div>

      <div>
        <p className="text-lg font-semibold text-[#1A1A1A]">
          This recipe contains{" "}
          <span className="text-[#227B6F] font-semibold">
            {detoxPercent}% detoxification support,
          </span>{" "}
          <span className="text-[#57605E]">
            and {hydrationPercent}% hydration.
          </span>
        </p>
      </div>
    </div>
  );
}
