import { TOKEN_PACKS } from "@/lib/tokens/spec";

export type CreditAction = "search" | "followup" | "generate";

const PACK_BLURBS: Record<string, string> = {
  "pack-10": "A quick top-up",
  "pack-45": "Most popular",
  "pack-85": "Better value",
  "pack-130": "Best value",
};

export const FREE_UNITS = 25;

export const FREE_USES_PER_SURFACE = 2;

export const FREE_SURFACES = {
  recipeGenerate: "recipe_generate",
  followupChat: "followup_chat",
  recipeSuggestions: "recipe_suggestions",
} as const;

export const PERSONALIZED_SEARCH_SURFACE = "personalized_search" as const;

export type FreeSurface =
  | (typeof FREE_SURFACES)[keyof typeof FREE_SURFACES]
  | typeof PERSONALIZED_SEARCH_SURFACE;

export const FREE_TRIALS_TOTAL =
  Object.keys(FREE_SURFACES).length * FREE_USES_PER_SURFACE;

export interface FreeTrialTokens {
  used: number;
  total: number;
  remaining: number;
  tokensLeft: number;
  exhausted: boolean;
}

export function freeTrialTokens(usedPerSurface: number[]): FreeTrialTokens {
  const total = FREE_TRIALS_TOTAL;
  const used = usedPerSurface.reduce(
    (sum, n) => sum + Math.min(Math.max(n, 0), FREE_USES_PER_SURFACE),
    0,
  );
  const remaining = Math.max(0, total - used);
  return {
    used,
    total,
    remaining,
    tokensLeft: total > 0 ? Math.ceil((remaining / total) * FREE_UNITS) : 0,
    exhausted: remaining <= 0,
  };
}

export const LOW_WARN_PCT = 0.8;

export const MAX_OUTPUT_TOKENS: Record<CreditAction, number> = {
  search: 1200,
  followup: 1024,
  generate: 2000,
};

export interface CreditBundle {
  id: string;
  credits: number;
  amount: number;
  label: string;
  blurb: string;
  mostBought?: boolean;
}

export const BUNDLES: CreditBundle[] = TOKEN_PACKS.map((p) => ({
  id: p.id,
  credits: p.units,
  amount: p.amount,
  label: `${p.tokens} tokens`,
  blurb: PACK_BLURBS[p.id] ?? "",
  mostBought: p.id === "pack-45",
}));

export function getBundle(id: string): CreditBundle | undefined {
  return BUNDLES.find((b) => b.id === id);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
