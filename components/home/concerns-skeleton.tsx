export default function ConcernsSkeleton() {
  // Varied widths so the placeholders read as separate pills, not one bar.
  const widths = ["w-20", "w-24", "w-16", "w-28", "w-20"];
  return (
    <div className="flex flex-wrap gap-2" aria-hidden="true">
      {widths.map((w, i) => (
        <div
          key={i}
          className={`${w} h-10 rounded-full bg-badge animate-pulse`}
        />
      ))}
    </div>
  );
}
