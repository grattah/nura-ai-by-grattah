import type { CardMatch } from "@/components/recipe/use-match-scores";

/**
 * Recipe Match Score badge (PRD §7.1/§7.4). Shows the recipe's HIGHEST credit
 * with the label of the condition/goal that produced it — the same value and
 * label its detail page shows.
 *
 * `match` is null for guests, non-subscribers, and users with no conditions or
 * goals; the badge renders nothing then (PRD §8). Note this previously received
 * a category-fit score, which is a different quantity and must not be labelled
 * "match".
 */
export function MatchBadge({ match }: { match?: CardMatch | null }) {
  if (!match) return null;
  const strong = match.percent >= 60;
  return (
    <div className="flex justify-between items-center gap-2">
      <p
        className={`font-medium text-xs py-0.5 px-1.5 rounded-sm tracking-[0.02em] truncate ${
          strong
            ? "bg-[#E3E8D7] text-success-c600"
            : "bg-[#EEE0CA] text-warning-c600"
        }`}
        title={match.label}
      >
        {match.label}
      </p>
      <p
        className={`text-sm shrink-0 ${strong ? "text-mint-green" : "text-warning-c600"}`}
      >
        {match.percent}%
      </p>
    </div>
  );
}
