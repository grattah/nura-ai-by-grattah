import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  precautionProse,
  opensByNaming,
  isMeaningfulAmount,
  isUsableProfile,
  parseUsageProfile,
  buildPrecautions,
  USAGE_FIELDS,
  CRITICAL_FIELD,
} from "@/lib/precautions/types";
import {
  RESEARCH_SYSTEM,
  QUALIFY_SYSTEM,
  AVOID_RECHECK_SYSTEM,
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
    usage_profile: { longTermUse: "Generally suitable for daily use." },
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
      longTermUse: "Suitable for daily use.",
      durationCycling: "   ",
      whoShouldAvoid: "Avoid in pregnancy.",
    });
    expect(p).toEqual({
      longTermUse: "Suitable for daily use.",
      whoShouldAvoid: "Avoid in pregnancy.",
    });
  });

  it("treats an all-empty profile as no profile", () => {
    expect(isUsableProfile({ longTermUse: "" })).toBe(false);
    expect(parseUsageProfile({ durationCycling: "  " })).toBeNull();
  });

  it.each([[null], [undefined], ["text"], [42], [[]]])(
    "rejects non-object %s",
    (raw) => {
      expect(isUsableProfile(raw)).toBe(false);
    },
  );

  it("ignores the PRD-3 fields left behind on older rows", () => {
    // PRD-4 dropped dailyLimit and sources. Rows written by the searched
    // pipeline keep those keys in jsonb; they must never reach the page, and a
    // row carrying ONLY them counts as having no profile at all rather than
    // rendering an empty block.
    expect(
      parseUsageProfile({
        dailyLimit: "Up to 600mg/day.",
        sources: ["NIH ODS"],
        longTermUse: "Suitable for daily use.",
      }),
    ).toEqual({ longTermUse: "Suitable for daily use." });

    expect(
      isUsableProfile({ dailyLimit: "Up to 600mg/day.", sources: ["NIH ODS"] }),
    ).toBe(false);
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
    expect(buildPrecautions([active({ needs_usage_profile: false })])).toEqual(
      [],
    );
  });

  it("excludes a qualifying ingredient that has not been researched yet", () => {
    expect(buildPrecautions([active({ usage_profile: null })])).toEqual([]);
  });

  it("excludes a garnish even when its ingredient qualifies", () => {
    expect(buildPrecautions([{ ...active(), grams: 0 }])).toEqual([]);
  });

  it("shows one block per ingredient when a recipe lists it twice", () => {
    const out = buildPrecautions([active(), { ...active(), position: 3 }]);
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

// ── §4.1: the prompt is the only safety control left ────────────────────────
describe("PRD-4 §4.1 — research prompt", () => {
  it("covers the three areas, and no longer asks for a dose", () => {
    expect(RESEARCH_SYSTEM).toMatch(/daily or long-term use/i);
    expect(RESEARCH_SYSTEM).toMatch(/duration of continuous use or cycling/i);
    expect(RESEARCH_SYSTEM).toMatch(/pregnancy and breastfeeding/i);
    // PRD-4 dropped the dose question. Without a source to read a figure from,
    // asking for one invites a recalled number presented as guidance.
    expect(RESEARCH_SYSTEM).not.toMatch(/maximum safe amount/i);
  });

  it("asks for precautions, not for three questions to be answered", () => {
    // The tab shows these as prose with no headings, so an answer written to
    // fill a heading is just noise. Measured before this rule existed: 111 of
    // 390 sentences (28%) had the substance "there is no restriction" —
    // "No cycling or breaks are needed", "No maximum duration is established".
    expect(RESEARCH_SYSTEM).toMatch(/Report ONLY precautions that genuinely apply/);
    expect(RESEARCH_SYSTEM).toMatch(/This is not a questionnaire to complete/);
    expect(RESEARCH_SYSTEM).toMatch(
      /NEVER write a sentence whose substance is "there is no restriction"/,
    );
    expect(RESEARCH_SYSTEM).toMatch(/return an empty object/i);
  });

  it("relies on training knowledge and forbids a fabricated citation", () => {
    expect(RESEARCH_SYSTEM).toMatch(/your own training knowledge/i);
    expect(RESEARCH_SYSTEM).toMatch(/do not fabricate a specific study or citation/i);
    expect(RESEARCH_SYSTEM).toMatch(/Do not include a citation/i);
  });

  it("no longer references web search or a source allow-list", () => {
    expect(RESEARCH_SYSTEM).not.toMatch(/\bsearch\b/i);
    expect(RESEARCH_SYSTEM).not.toMatch(/pubmed|cochrane|examine\.com|nih/i);
  });

  it("caps each sentence at 25 words", () => {
    // The first run averaged ~2,240 characters per ingredient — about 1,200
    // words on a three-active recipe, which nobody reads.
    expect(RESEARCH_SYSTEM).toMatch(/at most 25 words/);
    expect(RESEARCH_SYSTEM).toMatch(/Length is a hard requirement/i);
  });

  it("cuts narrative and reassurance, not named populations", () => {
    expect(RESEARCH_SYSTEM).toMatch(/history of use/i);
    expect(RESEARCH_SYSTEM).toMatch(/reassurance of any kind/i);
    expect(RESEARCH_SYSTEM).toMatch(
      /never trade a named population for a shorter line/i,
    );
  });

  it("biases the §2 classifier toward excluding whole foods when unsure", () => {
    expect(QUALIFY_SYSTEM).toMatch(/when genuinely uncertain, answer false/i);
  });
});

// ── the omission guard ──────────────────────────────────────────────────────
describe('the "who should avoid" guard', () => {
  it("names the field the generator re-asks for", () => {
    // Measured: Opus returned licorice root with no whoShouldAvoid on one run
    // and with it on the next, both stop_reason end_turn. The guard keys off
    // this constant, so a rename must not silently disable it.
    expect(CRITICAL_FIELD).toBe("whoShouldAvoid");
    expect(USAGE_FIELDS).toContain(CRITICAL_FIELD);
  });

  it("lets the re-ask come back empty instead of demanding a caution", () => {
    // Pressing for a contraindication is how one gets invented. The recheck
    // must keep "no one in particular" available as an answer.
    expect(AVOID_RECHECK_SYSTEM).toMatch(/no such group/i);
    expect(AVOID_RECHECK_SYSTEM).toMatch(/Do not invent a caution/i);
    expect(AVOID_RECHECK_SYSTEM).toMatch(/pregnancy and breastfeeding/i);
  });
});

describe("field labels", () => {
  it("covers exactly the three PRD-4 §3 fields, in reading order", () => {
    expect(USAGE_FIELDS).toEqual([
      "longTermUse",
      "durationCycling",
      "whoShouldAvoid",
    ]);
  });
});

// ── the RLS trap ────────────────────────────────────────────────────────────
describe("the reader must not use the caller's client", () => {
  // `ingredients` and `recipe_ingredients` have RLS enabled with NO policies,
  // so anon and authenticated both read ZERO rows. This has now cost two
  // separate features: every Match Score came back 0%, and later the
  // Precautions tab showed the empty state on all 127 recipes while 65
  // fully-populated profiles sat in the table.
  //
  // Source-reading rather than behavioural, deliberately: the failure is
  // invisible to a mock (a mock returns whatever rows you gave it) and the
  // integration suite needs a database that CI does not always have. This
  // catches the regression with neither.
  const src = readFileSync("lib/precautions/server.ts", "utf8");

  it("reads through the service-role client", () => {
    expect(src).toMatch(/createServiceRoleClient\(\)/);
  });

  it("does not accept a Supabase client from the caller", () => {
    // The page holds a cookie client. Taking one as a parameter is exactly how
    // the restored version reintroduced the bug.
    expect(src).not.toMatch(/supabase:\s*SupabaseClient/);
  });
});

// ── Prose rendering ─────────────────────────────────────────────────────────
describe("precautionProse", () => {
  it("joins the three answers into one paragraph, in reading order", () => {
    expect(
      precautionProse({
        whoShouldAvoid: "Avoid in pregnancy.",
        longTermUse: "Safe daily.",
        durationCycling: "No cycling needed.",
      }),
    ).toBe("Safe daily. No cycling needed. Avoid in pregnancy.");
  });

  it("omits a field that has no answer rather than leaving a gap", () => {
    expect(
      precautionProse({ longTermUse: "Safe daily.", whoShouldAvoid: "Avoid in pregnancy." }),
    ).toBe("Safe daily. Avoid in pregnancy.");
  });

  it("adds a full stop when the model omitted one", () => {
    // Without this the next sentence fuses onto the previous one and the block
    // becomes an unreadable run-on — silently, per ingredient.
    expect(
      precautionProse({ longTermUse: "Safe daily", durationCycling: "No cycling needed" }),
    ).toBe("Safe daily. No cycling needed.");
  });

  it("leaves other terminal punctuation alone", () => {
    expect(precautionProse({ longTermUse: "Is it safe daily? Yes!" })).toBe(
      "Is it safe daily? Yes!",
    );
  });

  it("returns an empty string for an empty profile", () => {
    // buildPrecautions already drops unusable profiles, so this never reaches
    // the page — but returning "" rather than throwing keeps that guarantee
    // from being load-bearing.
    expect(precautionProse({})).toBe("");
  });
});

// ── The prose has no heading, so it must identify itself ────────────────────
describe("opensByNaming", () => {
  it("accepts an opening that names its ingredient", () => {
    expect(
      opensByNaming("ground cinnamon", {
        longTermUse: "Ground cinnamon is safe daily in culinary amounts.",
      }),
    ).toBe(true);
  });

  it("rejects an opening that leaves the reader asking 'of what?'", () => {
    // The real case: with the heading removed this rendered as "Typical doses
    // of 300-600 mg daily appear well tolerated" with nothing saying of what,
    // sitting directly above another ingredient's paragraph.
    expect(
      opensByNaming("ashwagandha powder", {
        longTermUse: "Typical doses of 300–600 mg daily appear well tolerated.",
      }),
    ).toBe(false);
  });

  it("ignores words that identify nothing", () => {
    // "fresh" and "powder" appear in dozens of names; matching on them would
    // call almost any sentence a hit and the check would pass vacuously.
    expect(
      opensByNaming("fresh ginger", { longTermUse: "Fresh produce is fine daily." }),
    ).toBe(false);
  });

  it("matches on a prefix, so plurals and suffixes still count", () => {
    expect(
      opensByNaming("dried roselle calyces", {
        longTermUse: "Roselle (hibiscus) tea is fine for most adults daily.",
      }),
    ).toBe(true);
  });

  it("reads the FIRST answer present, not necessarily longTermUse", () => {
    expect(
      opensByNaming("licorice root", {
        whoShouldAvoid: "Licorice should be avoided in pregnancy.",
      }),
    ).toBe(true);
  });

  it("passes a profile with nothing to show, having nothing to mislabel", () => {
    expect(opensByNaming("anything", {})).toBe(true);
  });
});

describe("PRD-4 §4.1 — the prose has no heading", () => {
  it("tells the model to name the ingredient and never open with Yes/No", () => {
    // Both rules exist because the tab dropped the per-ingredient heading. An
    // answer beginning "Yes, up to 3-4 cups daily…" is answering a question the
    // reader cannot see.
    expect(RESEARCH_SYSTEM).toMatch(/Name the ingredient in your FIRST sentence/);
    expect(RESEARCH_SYSTEM).toMatch(/Never begin a sentence with "Yes" or "No"/);
  });
});
