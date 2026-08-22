import { describe, it, expect } from "vitest";
import {
  isMeaningfulAmount,
  isUsableProfile,
  parseUsageProfile,
  buildPrecautions,
  USAGE_FIELDS,
} from "@/lib/precautions/types";
import {
  RESEARCH_SYSTEM,
  QUALIFY_SYSTEM,
  ALLOWED_RESEARCH_DOMAINS,
} from "@/lib/precautions/prompts";

const active = (over: Record<string, unknown> = {}) => ({
  ingredient_id: "i1",
  quantity: 1,
  grams: 5,
  position: 0,
  ingredients: {
    id: "i1",
    name: "ashwagandha",
    needs_usage_profile: true,
    usage_profile: { dailyLimit: "Up to 600mg/day of root extract." },
    ...over,
  },
});

// ── §2: which ingredients count ─────────────────────────────────────────────
describe("PRD §2 — meaningful amount", () => {
  it("accepts a resolved ingredient with a real quantity and weight", () => {
    expect(
      isMeaningfulAmount({ ingredient_id: "i1", quantity: 2, grams: 10 }),
    ).toBe(true);
  });

  it.each([
    ["unresolved ingredient", { ingredient_id: null, quantity: 1, grams: 5 }],
    ["no listed quantity", { ingredient_id: "i1", quantity: null, grams: 5 }],
    ["zero quantity", { ingredient_id: "i1", quantity: 0, grams: 5 }],
    ["a garnish with no weight", { ingredient_id: "i1", quantity: 1, grams: 0 }],
  ])("rejects %s", (_why, row) => {
    expect(isMeaningfulAmount(row)).toBe(false);
  });
});

// ── §3: the omission rule ───────────────────────────────────────────────────
describe("PRD §3 — fields are omitted, never padded", () => {
  it("keeps only fields with a real answer", () => {
    const p = parseUsageProfile({
      dailyLimit: "Up to 600mg/day.",
      longTermUse: "   ",
      durationCycling: "",
      whoShouldAvoid: "Avoid in pregnancy.",
    });
    expect(p).toEqual({
      dailyLimit: "Up to 600mg/day.",
      whoShouldAvoid: "Avoid in pregnancy.",
    });
  });

  it("treats an all-empty profile as no profile", () => {
    expect(isUsableProfile({ dailyLimit: "", sources: ["NIH ODS"] })).toBe(false);
    expect(parseUsageProfile({ sources: ["NIH ODS"] })).toBeNull();
  });

  it.each([[null], [undefined], ["text"], [42], [[]]])(
    "rejects non-object %s",
    (raw) => {
      expect(isUsableProfile(raw)).toBe(false);
    },
  );

  it("drops empty source strings but keeps real ones", () => {
    expect(parseUsageProfile({ dailyLimit: "x", sources: ["", " ", "NIH ODS"] }))
      .toEqual({ dailyLimit: "x", sources: ["NIH ODS"] });
  });
});

// ── §5: display rules ───────────────────────────────────────────────────────
describe("PRD §5 — display", () => {
  it("includes a qualifying ingredient with a cached profile", () => {
    const out = buildPrecautions([active()]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("ashwagandha");
  });

  it("excludes whole foods, even when a profile somehow exists", () => {
    // §2 is the gate. A stale profile on a re-classified ingredient must not
    // resurface as a precaution.
    expect(
      buildPrecautions([active({ needs_usage_profile: false })]),
    ).toEqual([]);
  });

  it("excludes a qualifying ingredient that has not been researched yet", () => {
    expect(buildPrecautions([active({ usage_profile: null })])).toEqual([]);
  });

  it("excludes a garnish even when its ingredient qualifies", () => {
    const row = { ...active(), grams: 0 };
    expect(buildPrecautions([row])).toEqual([]);
  });

  it("shows one block per ingredient when a recipe lists it twice", () => {
    // e.g. "ginger, grated" and "ginger, to garnish" resolving to one row.
    const out = buildPrecautions([
      active(),
      { ...active(), position: 3 },
    ]);
    expect(out).toHaveLength(1);
  });

  it("orders blocks by recipe position, not query order", () => {
    const second = {
      ...active(),
      ingredient_id: "i2",
      position: 1,
      ingredients: { ...active().ingredients, id: "i2", name: "licorice root" },
    };
    const out = buildPrecautions([second, active()]);
    expect(out.map((p) => p.name)).toEqual(["ashwagandha", "licorice root"]);
  });

  it("returns empty rather than throwing when a recipe has no qualifying ingredients", () => {
    // §5: the caller renders a reassuring state; it must never hide the tab.
    expect(buildPrecautions([])).toEqual([]);
  });
});

// ── §4.1: the prompt is the safety control ──────────────────────────────────
describe("PRD §4.1 — research prompt", () => {
  it("names all four required questions", () => {
    expect(RESEARCH_SYSTEM).toMatch(/daily limit or maximum safe amount/i);
    expect(RESEARCH_SYSTEM).toMatch(/daily or long-term use/i);
    expect(RESEARCH_SYSTEM).toMatch(/cycling\/taking breaks/i);
    expect(RESEARCH_SYSTEM).toMatch(/pregnancy and breastfeeding/i);
  });

  it("forbids blogs and requires omission over guessing", () => {
    expect(RESEARCH_SYSTEM).toMatch(/Do NOT use general health blogs/i);
    expect(RESEARCH_SYSTEM).toMatch(/omit it rather than guessing/i);
    expect(RESEARCH_SYSTEM).toMatch(/Never invent a number/i);
  });

  it("restricts search to the §4.1 sources", () => {
    // The prompt's source list is only advisory; this list is enforced.
    expect(ALLOWED_RESEARCH_DOMAINS).toContain("ods.od.nih.gov");
    expect(ALLOWED_RESEARCH_DOMAINS).toContain("pubmed.ncbi.nlm.nih.gov");
    expect(ALLOWED_RESEARCH_DOMAINS).toContain("cochranelibrary.com");
    expect(ALLOWED_RESEARCH_DOMAINS).toContain("examine.com");
    // A wellness domain slipping in would silently undo the §4.1 restriction.
    expect(ALLOWED_RESEARCH_DOMAINS.join()).not.toMatch(
      /healthline|webmd|draxe|goop/i,
    );
  });

  it("biases the §2 classifier toward excluding whole foods when unsure", () => {
    expect(QUALIFY_SYSTEM).toMatch(/when genuinely uncertain, answer false/i);
  });
});

describe("field labels", () => {
  it("covers exactly the four PRD §3 fields", () => {
    expect(USAGE_FIELDS.map(([k]) => k)).toEqual([
      "dailyLimit",
      "longTermUse",
      "durationCycling",
      "whoShouldAvoid",
    ]);
  });
});
