import Link from "next/link";

interface RecipesEmptyStateProps {
  query?: string;
}

export function RecipesEmptyState({ query }: RecipesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-3xl mb-4">🌿</p>
      <p className="text-base font-semibold text-foreground mb-1">
        {query ? `No recipes found for "${query}"` : "No recipes found"}
      </p>
      <p className="text-sm text-muted-foreground mb-6">
        {query
          ? "Try a different search term or browse by category."
          : "Check back soon — we're always adding new recipes."}
      </p>
      <Link
        href="/find-recipe"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-mint-green text-sm font-semibold"
        style={{ color: "var(--mint-green)" }}
      >
        Find a recipe →
      </Link>
    </div>
  );
}
