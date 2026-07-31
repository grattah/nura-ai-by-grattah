/**
 * Category Score badge. Category PRD §6.3 is emphatic that this number must
 * NEVER be labelled "match":
 *
 *   "Category Score is a GENERAL score, the same for every user. It must never be
 *   labeled using the word 'Match' […] since that implies personalization to a
 *   specific user's profile. […] The word 'Match' is reserved exclusively for the
 *   Recipe Match Score."
 *
 * So this renders "68% support". For the personalized number, use MatchBadge —
 * it is only correct where the score came from computeMatchScore().
 */
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
