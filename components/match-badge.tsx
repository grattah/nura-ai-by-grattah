/**
 * Category-fit badge for recipe cards in listings/search. `score` is the
 * recipe's CategoryScore for the category being viewed (recipe_categories.score)
 * — a per-category ranking, NOT the personalised Recipe Match Score.
 *
 * The Recipe Match Score (and the condition/goal label that produced it) is
 * shown only on the recipe detail page.
 */
export function MatchBadge({ score }: { score?: number | null }) {
  if (score == null) return null;
  const strong = score >= 60;
  return (
    <div className="flex justify-between items-center">
      <p
        className={`font-medium text-xs py-0.5 px-1.5 rounded-sm tracking-[0.02em] ${
          strong
            ? "bg-[#E3E8D7] text-success-c600"
            : "bg-[#EEE0CA] text-warning-c600"
        }`}
      >
        {strong ? "Strong match" : "Moderate match"}
      </p>
      <p
        className={`text-sm ${strong ? "text-mint-green" : "text-warning-c600"}`}
      >
        {score}%
      </p>
    </div>
  );
}
