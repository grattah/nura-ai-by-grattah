export function SupportBadge({ score }: { score?: number | null }) {
  if (score == null) return null;
  return (
    <div className="flex justify-between items-center">
      <p className="font-medium text-xs py-0.5 px-1.5 rounded-sm tracking-[0.02em] bg-[#E3E8D7] text-success-c600">
        {Math.round(score)}% support
      </p>
    </div>
  );
}
