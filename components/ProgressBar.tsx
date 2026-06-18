interface ProgressBarProps {
  value: number; // 0–100
  color?: string; // fill color, e.g. "#227B6F"
  trackColor?: string; // background track color
  height?: number; // bar thickness in px
  className?: string;
}

export function ProgressBar({
  value,
  color = "#227B6F",
  trackColor = "#E2E4E4",
  height = 8,
  className,
}: ProgressBarProps) {
  // Guard the input so a bad value can't overflow or invert the bar.
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
