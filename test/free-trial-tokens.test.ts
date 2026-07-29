import { describe, it, expect } from "vitest";
import {
  freeTrialTokens,
  FREE_TRIALS_TOTAL,
  FREE_UNITS,
  FREE_USES_PER_SURFACE,
  FREE_SURFACES,
} from "@/lib/credits";

// The 25-token wallet was retired; gating is now N free uses of each paywalled
// surface. The Free Plan card still speaks "tokens", so remaining trials are
// projected onto the 25-token scale. These pin that projection.

describe("freeTrialTokens", () => {
  it("derives the total from the surfaces × per-surface allowance", () => {
    expect(FREE_TRIALS_TOTAL).toBe(
      Object.keys(FREE_SURFACES).length * FREE_USES_PER_SURFACE,
    );
    expect(FREE_TRIALS_TOTAL).toBe(6); // 3 surfaces × 2
  });

  it("shows the full allowance before anything is used", () => {
    const t = freeTrialTokens([0, 0, 0]);
    expect(t.used).toBe(0);
    expect(t.remaining).toBe(6);
    expect(t.tokensLeft).toBe(FREE_UNITS); // 25
    expect(t.exhausted).toBe(false);
  });

  it("matches the worked example: 2 used → 4 left → 17 tokens", () => {
    // 4/6 × 25 = 16.67, rounded up.
    const t = freeTrialTokens([2, 0, 0]);
    expect(t.used).toBe(2);
    expect(t.remaining).toBe(4);
    expect(t.tokensLeft).toBe(17);
    expect(t.exhausted).toBe(false);
  });

  it("rounds up so any remaining trial never reads as 0 tokens", () => {
    const t = freeTrialTokens([2, 2, 1]); // 1 of 6 left → 4.17
    expect(t.remaining).toBe(1);
    expect(t.tokensLeft).toBe(5);
    expect(t.exhausted).toBe(false);
  });

  it("is exhausted only when every trial is spent", () => {
    const t = freeTrialTokens([2, 2, 2]);
    expect(t.remaining).toBe(0);
    expect(t.tokensLeft).toBe(0);
    expect(t.exhausted).toBe(true);
  });

  it("caps each surface so one can't consume another's allowance", () => {
    // A surface reporting 5 uses must still only count for its own 2.
    const t = freeTrialTokens([5, 0, 0]);
    expect(t.used).toBe(2);
    expect(t.remaining).toBe(4);
    expect(t.tokensLeft).toBe(17);
  });

  it("ignores negative counts", () => {
    expect(freeTrialTokens([-3, 0, 0]).remaining).toBe(6);
  });
});
