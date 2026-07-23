// Estimated model pricing for the token-usage dashboard (USD per 1M tokens,
// plus per-image for image models). Estimates only — update when prices change.
// Kept in one place so the dashboard's cost figures are easy to recalibrate.

export interface ModelPrice {
  input: number; // $ per 1M input tokens
  output: number; // $ per 1M output tokens
  perImage?: number; // $ per generated image
}

export const MODEL_PRICING: Record<string, ModelPrice> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-3.1-flash-image-preview": { input: 0.3, output: 2.5, perImage: 0.04 },
  "gemini-embedding-2": { input: 0.15, output: 0 },
};

// Fallback when a model isn't in the map (e.g. backfilled "unknown" rows).
const DEFAULT_PRICE: ModelPrice = { input: 1.0, output: 5.0 };

export function priceFor(model: string): ModelPrice {
  return MODEL_PRICING[model] ?? DEFAULT_PRICE;
}

export interface UsageRow {
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  images?: number;
}

/** Estimated USD cost of a usage row (or an aggregate with the same fields). */
export function estimateCostUsd(row: UsageRow): number {
  const p = priceFor(row.model);
  const input = row.input_tokens ?? 0;
  const output = row.output_tokens ?? 0;
  const total = row.total_tokens ?? 0;
  const images = row.images ?? 0;

  let tokenCost: number;
  if (input === 0 && output === 0 && total > 0) {
    // Only a combined total is known (e.g. backfilled rows) — blend the rates.
    tokenCost = (total / 1_000_000) * ((p.input + p.output) / 2);
  } else {
    tokenCost = (input / 1_000_000) * p.input + (output / 1_000_000) * p.output;
  }
  const imageCost = images * (p.perImage ?? 0);
  return tokenCost + imageCost;
}
