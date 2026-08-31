import { supportLabel } from "@/lib/scoring/tier-score";

/**
 * Category Score badge. Category PRD §5 is emphatic that this number must
 * NEVER be labelled "match":
 *
 *   "Category Score pages must use 'support' or 'strength,' never 'match' —
 *    that word is reserved for the personalized Recipe Match Score, to avoid
 *    implying personalization that isn't there."
 *
 * §5 also defines strength bands: ≥60% "Strong support", 40–59% "Moderate
 * support", below 40% not shown at all. `supportLabel` in tier-score.ts has
 * always encoded them and nothing called it, so the badge showed a bare
 * percentage and the bands existed only on paper.
 *
 * For the personalized number, use MatchBadge — it is only correct where the
 * score came from computeMatchScore().
 */
export function SupportBadge({ score }: { score?: number | null }) {
  if (score == null) return null;

  // Below the 40% floor supportLabel returns null. A recipe should not reach a
  // category page at all in that case (the query filters on `qualified`), but
  // if one does, show the percentage without claiming a strength for it.
  const label = supportLabel(score);

  return (
    <div className="flex justify-between items-center gap-1.5">
      <p className="font-medium text-xs py-0.5 px-1.5 rounded-sm tracking-[0.02em] bg-[#E3E8D7] text-success-c600">
        {Math.round(score)}% support
      </p>
      {label && (
        <span className="text-[10px] font-medium tracking-[0.02em] text-subtle whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  );
}
