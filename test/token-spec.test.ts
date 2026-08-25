import { describe, it, expect } from "vitest";
import {
  ACTION_UNITS,
  PLAN_GRANTS,
  TOKEN_PACKS,
  SUBSCRIPTION_UNITS_PER_TOKEN,
  subscriptionTokenCost,
  purchasedTokenCost,
  subscriptionUnitsToTokens,
  planSpend,
  releaseReservation,
  allocateSubscription,
  allocationDateInMonth,
  nextMonthlyAllocation,
  nextWeeklyAllocation,
  anchorDayFrom,
  lapse,
  unfreeze,
  upgrade,
  walletView,
  type Balances,
} from "@/lib/tokens/spec";

const bal = (sub: number, pur: number, frozen = false): Balances => ({
  subscriptionUnits: sub,
  purchasedUnits: pur,
  purchasedFrozen: frozen,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

// ── §2 Internal units ───────────────────────────────────────────────────────

describe("§2 — units reproduce both published rate cards", () => {
  it.each([
    ["followup", 1, 0.5, 1],
    ["suggestion", 1, 0.5, 1],
    ["generate", 3, 1.5, 3],
  ] as const)("%s costs %i units = %s sub tokens / %s purchased", (action, units, sub, pur) => {
    expect(ACTION_UNITS[action]).toBe(units);
    expect(subscriptionTokenCost(action)).toBe(sub);
    expect(purchasedTokenCost(action)).toBe(pur);
  });

  it("displays subscription units as half-tokens", () => {
    expect(SUBSCRIPTION_UNITS_PER_TOKEN).toBe(2);
    expect(subscriptionUnitsToTokens(30)).toBe(15);
    expect(subscriptionUnitsToTokens(1)).toBe(0.5);
  });
});

// ── §3 Allocation ───────────────────────────────────────────────────────────

describe("§3 — plan grants", () => {
  it("grants 15 tokens weekly and 50 monthly", () => {
    expect(PLAN_GRANTS.weekly).toMatchObject({ tokens: 15, units: 30, cadence: "weekly" });
    expect(PLAN_GRANTS.monthly).toMatchObject({ tokens: 50, units: 100, cadence: "monthly" });
  });

  it("does NOT front-load the yearly plan", () => {
    // The spec is explicit: 50/month across the year, not 600 up front.
    expect(PLAN_GRANTS.annual).toMatchObject({ tokens: 50, units: 100, cadence: "monthly" });
    expect(PLAN_GRANTS.annual.units).not.toBe(PLAN_GRANTS.monthly.units * 12);
  });

  it("replaces the balance rather than adding to it", () => {
    // Weekly subscriber who used nothing starts next week at 15, not 30.
    const untouched = bal(30, 0);
    expect(allocateSubscription("weekly", untouched).subscriptionUnits).toBe(30);
    // Monthly who used nothing starts at 50, not 100.
    expect(allocateSubscription("monthly", bal(100, 0)).subscriptionUnits).toBe(100);
    // And a partly-spent balance is topped back to exactly the grant.
    expect(allocateSubscription("weekly", bal(7, 0)).subscriptionUnits).toBe(30);
  });

  it("never touches purchased units", () => {
    const after = allocateSubscription("monthly", bal(0, 42, true));
    expect(after.purchasedUnits).toBe(42);
    expect(after.purchasedFrozen).toBe(true);
  });
});

describe("§3 — anniversary day", () => {
  it("grants on the 15th every month for a 15 March signup", () => {
    const anchor = anchorDayFrom(new Date("2026-03-15T00:00:00Z"));
    expect(anchor).toBe(15);
    expect(iso(nextMonthlyAllocation(anchor, new Date("2026-03-15T12:00:00Z")))).toBe("2026-04-15");
    expect(iso(nextMonthlyAllocation(anchor, new Date("2026-04-15T12:00:00Z")))).toBe("2026-05-15");
  });

  it("clamps a 31st anchor to the last day of short months", () => {
    const anchor = 31;
    expect(iso(allocationDateInMonth(anchor, 2026, 3))).toBe("2026-04-30"); // April
    expect(iso(allocationDateInMonth(anchor, 2026, 4))).toBe("2026-05-31"); // May
    expect(iso(allocationDateInMonth(anchor, 2027, 1))).toBe("2027-02-28"); // Feb, non-leap
  });

  it("uses 29 February in a leap year", () => {
    expect(iso(allocationDateInMonth(31, 2028, 1))).toBe("2028-02-29");
  });

  it("does NOT let the fallback permanently shift the anniversary", () => {
    // The rule that is easiest to get wrong: after a clamped grant on 28 Feb,
    // the next one must be 31 March, not 28 March. Computing from the previous
    // grant date instead of the anchor is what breaks this.
    const anchor = 31;
    const feb = new Date("2027-02-28T00:00:00Z");
    expect(iso(nextMonthlyAllocation(anchor, feb))).toBe("2027-03-31");
  });

  it("walks a 31st subscriber through a full year without drift", () => {
    const anchor = 31;
    let d = new Date("2026-03-31T00:00:00Z");
    const dates: string[] = [];
    for (let i = 0; i < 12; i++) {
      d = nextMonthlyAllocation(anchor, d);
      dates.push(iso(d));
    }
    expect(dates).toEqual([
      "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31",
      "2026-08-31", "2026-09-30", "2026-10-31", "2026-11-30",
      "2026-12-31", "2027-01-31", "2027-02-28", "2027-03-31",
    ]);
  });

  it("puts weekly grants seven days after the previous renewal", () => {
    expect(iso(nextWeeklyAllocation(new Date("2026-08-22T00:00:00Z")))).toBe("2026-08-29");
  });
});

// ── §4 Packs ────────────────────────────────────────────────────────────────

describe("§4 — purchased token packs", () => {
  it("matches the published price list", () => {
    expect(TOKEN_PACKS.map((p) => [p.amount, p.tokens])).toEqual([
      [99, 10],
      [399, 45],
      [699, 85],
      [999, 130],
    ]);
  });

  it("stores purchased tokens 1:1 as units", () => {
    for (const p of TOKEN_PACKS) expect(p.units).toBe(p.tokens);
  });

  it("makes larger packs strictly better value", () => {
    const perToken = TOKEN_PACKS.map((p) => p.amount / p.tokens);
    for (let i = 1; i < perToken.length; i++) {
      expect(perToken[i]).toBeLessThan(perToken[i - 1]);
    }
  });
});

// ── §5 Spend routing ────────────────────────────────────────────────────────

describe("§5 — spend routing", () => {
  it("runs the spec's worked example", () => {
    // 1 subscription token (2 units) + 5 purchased (5 units), requests a recipe.
    const plan = planSpend("generate", bal(2, 5));
    expect(plan.ok).toBe(true);
    expect(plan.fromSubscription).toBe(2);
    expect(plan.fromPurchased).toBe(1);
    expect(plan.after.subscriptionUnits).toBe(0);
    expect(plan.after.purchasedUnits).toBe(4);
    // Displayed as 0 subscription tokens, 4 purchased tokens.
    const view = walletView(plan.after);
    expect(view.subscriptionTokens).toBe(0);
    expect(view.purchasedTokens).toBe(4);
  });

  it("runs the spec's insufficient example", () => {
    // 0 subscription, 2 purchased, requests a recipe (3 units) → blocked.
    const plan = planSpend("generate", bal(0, 2));
    expect(plan.ok).toBe(false);
    expect(plan.shortfall).toBe(1);
    // A blocked action must spend nothing at all.
    expect(plan.fromSubscription).toBe(0);
    expect(plan.fromPurchased).toBe(0);
    expect(plan.after).toEqual(bal(0, 2));
  });

  it("always drains subscription before purchased", () => {
    const plan = planSpend("generate", bal(100, 100));
    expect(plan.fromSubscription).toBe(3);
    expect(plan.fromPurchased).toBe(0);
  });

  it("cannot spend frozen purchased units", () => {
    const plan = planSpend("followup", bal(0, 50, true));
    expect(plan.ok).toBe(false);
    // Frozen units are preserved, never reduced.
    expect(plan.after.purchasedUnits).toBe(50);
  });

  it("still spends subscription units while purchased are frozen", () => {
    // Reachable during the paid remainder after a cancellation.
    const plan = planSpend("followup", bal(4, 50, true));
    expect(plan.ok).toBe(true);
    expect(plan.fromSubscription).toBe(1);
    expect(plan.fromPurchased).toBe(0);
  });
});

// ── §6 Reserve / settle / release ───────────────────────────────────────────

describe("§6 — releasing a reservation", () => {
  it("refunds to the same balances in the same proportions", () => {
    const before = bal(2, 5);
    const plan = planSpend("generate", before);
    expect(releaseReservation(plan, plan.after)).toEqual(before);
  });

  it("does not move value between balances on a mixed spend", () => {
    // The failure mode: refunding all 3 units to purchased would quietly grant
    // the user a subscription unit's worth of extra purchased value.
    const plan = planSpend("generate", bal(1, 10));
    const restored = releaseReservation(plan, plan.after);
    expect(restored.subscriptionUnits).toBe(1);
    expect(restored.purchasedUnits).toBe(10);
  });

  it("keeps the frozen flag across a release", () => {
    const plan = planSpend("followup", bal(2, 5, true));
    expect(releaseReservation(plan, plan.after).purchasedFrozen).toBe(true);
  });
});

// ── §7 Lifecycle ────────────────────────────────────────────────────────────

describe("§7 — lifecycle", () => {
  it("kills subscription units and freezes purchased on lapse", () => {
    const after = lapse(bal(40, 25));
    expect(after.subscriptionUnits).toBe(0);
    expect(after.purchasedUnits).toBe(25); // retained, not destroyed
    expect(after.purchasedFrozen).toBe(true);
  });

  it("unfreezes purchased at their previous value", () => {
    const frozen = lapse(bal(40, 25));
    expect(unfreeze(frozen).purchasedUnits).toBe(25);
    expect(unfreeze(frozen).purchasedFrozen).toBe(false);
  });

  it("runs the spec's upgrade example", () => {
    // Weekly subscriber with 12 tokens (24 units) upgrades to monthly on the 9th.
    const at = new Date("2026-09-09T10:00:00Z");
    const res = upgrade("monthly", at, bal(24, 7));
    // Balance becomes 50 tokens (100 units) immediately — reset, not topped up.
    expect(res.balances.subscriptionUnits).toBe(100);
    expect(subscriptionUnitsToTokens(res.balances.subscriptionUnits)).toBe(50);
    // Anniversary moves to the upgrade date.
    expect(res.anchorDay).toBe(9);
    expect(iso(nextMonthlyAllocation(res.anchorDay, at))).toBe("2026-10-09");
    // Purchased are unaffected.
    expect(res.balances.purchasedUnits).toBe(7);
  });

  it("never tops up on upgrade", () => {
    // Topping up would give 24 + 100; the spec says reset.
    expect(upgrade("monthly", new Date(), bal(24, 0)).balances.subscriptionUnits).toBe(100);
  });
});

// ── Catalogue drift ─────────────────────────────────────────────────────────
//
// The buy-tokens UI kept its own hardcoded copy of the packs. When the spec's
// packs replaced the old ones, the shared catalogue changed but the UI copy did
// not — so the page advertised retired prices AND sent ids the server no longer
// recognised, failing every purchase with "Unknown token bundle".
//
// Three things must agree: the spec catalogue, the server's validator, and the
// component's list.
describe("token pack catalogue has a single source", () => {
  it("exposes every spec pack through the server's validator", async () => {
    const { getBundle } = await import("@/lib/credits");
    for (const pack of TOKEN_PACKS) {
      const bundle = getBundle(pack.id);
      expect(bundle, `checkout rejects "${pack.id}"`).toBeDefined();
      expect(bundle!.amount).toBe(pack.amount);
      // Purchased tokens are 1 unit each, so units credited === tokens sold.
      expect(bundle!.credits).toBe(pack.tokens);
    }
  });

  it("offers nothing the server would reject", async () => {
    const { BUNDLES, getBundle } = await import("@/lib/credits");
    for (const b of BUNDLES) expect(getBundle(b.id)).toBeDefined();
    expect(BUNDLES).toHaveLength(TOKEN_PACKS.length);
  });

  it("keeps the buy-tokens UI free of a hardcoded pack list", async () => {
    const src = (await import("node:fs")).readFileSync(
      "components/tokens/BuyTokens.tsx",
      "utf8",
    );
    expect(src).toContain("TOKEN_PACKS");
    // The retired ids and prices must not reappear.
    for (const dead of ['"starter"', '"popular"', '"value"', '"power"']) {
      expect(src, `stale pack id ${dead}`).not.toContain(`id: ${dead}`);
    }
    expect(src).not.toMatch(/price:\s*19\.99/);
  });
});
