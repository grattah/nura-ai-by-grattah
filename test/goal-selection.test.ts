import { describe, it, expect } from "vitest";
import { toggleCapped, MAX_GOALS, toggle } from "@/lib/health-profile/toggle";
import { GOALS } from "@/lib/health-profile/options";

describe("goal selection cap", () => {
  it("allows exactly three", () => {
    expect(MAX_GOALS).toBe(3);
    let sel: string[] = [];
    for (const k of ["a", "b", "c"]) sel = toggleCapped(sel, k, MAX_GOALS);
    expect(sel).toEqual(["a", "b", "c"]);
  });

  it("never exceeds the cap however many are tapped", () => {
    let sel: string[] = [];
    for (const g of GOALS) sel = toggleCapped(sel, g.key, MAX_GOALS);
    expect(sel).toHaveLength(MAX_GOALS);
  });

  it("drops the oldest rather than ignoring the tap", () => {
    const sel = toggleCapped(["a", "b", "c"], "d", MAX_GOALS);
    expect(sel).toEqual(["b", "c", "d"]);
    expect(sel).toContain("d");
  });

  it("always allows deselect, even at the cap", () => {
    expect(toggleCapped(["a", "b", "c"], "b", MAX_GOALS)).toEqual(["a", "c"]);
  });

  it("re-selecting after deselect gets back to three", () => {
    let sel = ["a", "b", "c"];
    sel = toggleCapped(sel, "b", MAX_GOALS);
    sel = toggleCapped(sel, "d", MAX_GOALS);
    expect(sel).toEqual(["a", "c", "d"]);
  });

  it("applies sequentially without losing a selection", () => {
    const taps = ["a", "b", "c"];
    const sequential = taps.reduce<string[]>(
      (acc, k) => toggleCapped(acc, k, MAX_GOALS),
      [],
    );
    expect(sequential).toHaveLength(3);
  });

  it("leaves the uncapped toggle alone for conditions", () => {
    expect(toggle(["a", "b", "c", "d"], "e")).toHaveLength(5);
  });
});
