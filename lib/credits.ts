// Credit economy config — shared by client and server. Pure (no I/O).
//
// Credits meter user-initiated LLM work. Subscribers get DAILY_GRANT credits
// each day; unused credits carry over forever (never expire). They can also buy
// one-time bundles. Costs are fixed per action; token caps on each LLM call keep
// the real cost behind one credit bounded.

export type CreditAction = "search" | "followup" | "generate";

export const DAILY_GRANT = 30;
export const LOW_THRESHOLD = 10;

export const COSTS: Record<CreditAction, number> = {
  search: 1,
  followup: 1,
  // Covers the whole recipe deliverable — text generation + the lazily
  // generated hero image (the image route isn't billed separately).
  generate: 3,
};

// Output-token ceilings per metered call, so one credit maps to a bounded spend.
export const MAX_OUTPUT_TOKENS: Record<CreditAction, number> = {
  search: 1200,
  followup: 1024,
  generate: 2000,
};

export interface CreditBundle {
  id: string;
  credits: number;
  amount: number; // price in pence (GBP)
  label: string;
  blurb: string;
  mostBought?: boolean;
}

export const BUNDLES: CreditBundle[] = [
  { id: "starter", credits: 50, amount: 199, label: "Starter", blurb: "Can last you a week" },
  {
    id: "popular",
    credits: 150,
    amount: 499,
    label: "Popular",
    blurb: "Can last you a month",
    mostBought: true,
  },
  { id: "value", credits: 350, amount: 999, label: "Value", blurb: "Can last you 3 months" },
  { id: "power", credits: 800, amount: 1999, label: "Power", blurb: "Can last you 6 months" },
];

export function getBundle(id: string): CreditBundle | undefined {
  return BUNDLES.find((b) => b.id === id);
}

/** Format pence as a GBP price, e.g. 499 -> "£4.99". */
export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
