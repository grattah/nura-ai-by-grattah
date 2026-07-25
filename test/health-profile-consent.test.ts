import { describe, it, expect } from "vitest";
import { needsConsent } from "@/lib/health-profile/consent";
import { CONSENT_VERSION } from "@/lib/health-profile/options";
import {
  EMPTY_DRAFT,
  type HealthProfileDraft,
} from "@/lib/health-profile/types";

// The single predicate both the client (routing + Save enablement) and the
// server action (authoritative guard) use. Regression cover for the bug where a
// profile saved WITHOUT sensitive data could later have sensitive data added,
// but the consent checkbox was unreachable.

const basic = {
  ageRange: "35-44",
  biologicalSex: "female",
  pregnancyStatus: "not-pregnant",
};
const draft = (over: Partial<HealthProfileDraft> = {}): HealthProfileDraft => ({
  ...EMPTY_DRAFT,
  basic,
  ...over,
});

describe("needsConsent", () => {
  it("is false with no sensitive data (basic + goals only)", () => {
    expect(needsConsent(draft({ goals: ["energy"] }))).toBe(false);
  });

  it("is true once sensitive data is added without consent", () => {
    // The exact bug: a saved, unconsented profile gains a condition.
    expect(needsConsent(draft({ conditions: ["type-2-diabetes"] }))).toBe(true);
    expect(needsConsent(draft({ allergies: ["peanuts"] }))).toBe(true);
    expect(
      needsConsent(draft({ medications: [{ name: "Metformin", rxcui: "1" }] })),
    ).toBe(true);
    expect(needsConsent(draft({ conditionsOther: "gout" }))).toBe(true);
    expect(needsConsent(draft({ allergiesOther: "kiwi" }))).toBe(true);
  });

  it("is false with sensitive data + consent at the current version", () => {
    expect(
      needsConsent(
        draft({
          conditions: ["pcos"],
          consent: true,
          consentVersion: CONSENT_VERSION,
        }),
      ),
    ).toBe(false);
  });

  it("re-prompts when the stored consent is for an older version", () => {
    expect(
      needsConsent(
        draft({
          conditions: ["pcos"],
          consent: true,
          consentVersion: "2020-01-01",
        }),
      ),
    ).toBe(true);
  });

  it("re-prompts when consent was never versioned (legacy row)", () => {
    expect(
      needsConsent(
        draft({ conditions: ["pcos"], consent: true, consentVersion: null }),
      ),
    ).toBe(true);
  });

  it("ignores stale consent flags when no sensitive data remains", () => {
    // Consent is sticky in the DB, but an all-clear profile never blocks a save.
    expect(
      needsConsent(draft({ consent: true, consentVersion: "2020-01-01" })),
    ).toBe(false);
  });
});
