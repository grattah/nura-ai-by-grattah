interface ProgressBarProps {
  value: number;
  color?: string;
  trackColor?: string;
  height?: number;
  className?: string;
}

export function ProgressBar({
  value,
  color = "#227B6F",
  trackColor = "#E2E4E4",
  height = 8,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={className}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ backgroundColor: trackColor, height }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
