import { describe, it, expect } from "vitest";
import { needsConsent } from "@/lib/health-profile/consent";
import { CONSENT_VERSION } from "@/lib/health-profile/options";
import {
  EMPTY_DRAFT,
  type HealthProfileDraft,
} from "@/lib/health-profile/types";

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
    expect(
      needsConsent(draft({ consent: true, consentVersion: "2020-01-01" })),
    ).toBe(false);
  });
});
