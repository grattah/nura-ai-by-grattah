"use client";

interface DetoxCardProps {
  detoxPercent: number;
  hydrationPercent: number;
}

export function DetoxCard({ detoxPercent, hydrationPercent }: DetoxCardProps) {
  // Ring geometry
  const size = 82;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (detoxPercent / 100) * circumference;

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
          <span className="text-2xl font-semibold text-[#19803F]">
            {detoxPercent}%
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-base text-black font-semibold">
          {" "}
          This recipe contains{" "}
        </p>
        <p className="text-base">
          <span className="text-mint-green font-semibold">
            {detoxPercent}% detoxification support,
          </span>{" "}
          <span className="text-subtle">
            and {hydrationPercent}% hydration.
          </span>
        </p>
      </div>
    </div>
  );
}
