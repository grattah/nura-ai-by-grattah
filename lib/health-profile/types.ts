// The in-memory draft shape used by the collection flow + the persisted row.
// Mirrors the `health_profiles` table.

export interface BasicProfile {
  ageRange: string | null;
  biologicalSex: string | null;
  pregnancyStatus: string | null;
}

export interface HealthProfileDraft {
  basic: BasicProfile;
  goals: string[]; // category slugs
  conditions: string[];
  conditionsOther: string;
  allergies: string[];
  allergiesOther: string;
  medications: string[]; // free-text names
  dietaryPattern: string | null; // single-select
  consent: boolean;
}

// Optional sections a user can clear individually from the populated view.
export type ProfileSection =
  | "goals"
  | "conditions"
  | "allergies"
  | "medications"
  | "dietary";

// The steps of the questionnaire, in order. Used for navigation + the Review
// screen's per-section "Edit" deep-links.
export const STEP_ORDER = [
  "basic",
  "goals",
  "conditions",
  "allergies",
  "medications",
  "dietary",
  "review",
] as const;
export type Step = (typeof STEP_ORDER)[number];

// Sections that carry sensitive data (PRD §2.3–2.5) — presence of any triggers
// the affirmative-consent requirement.
export function hasSensitiveData(draft: HealthProfileDraft): boolean {
  return (
    draft.conditions.length > 0 ||
    draft.conditionsOther.trim().length > 0 ||
    draft.allergies.length > 0 ||
    draft.allergiesOther.trim().length > 0 ||
    draft.medications.length > 0
  );
}

export function isBasicComplete(draft: HealthProfileDraft): boolean {
  const { ageRange, biologicalSex, pregnancyStatus } = draft.basic;
  return !!ageRange && !!biologicalSex && !!pregnancyStatus;
}

export const EMPTY_DRAFT: HealthProfileDraft = {
  basic: { ageRange: null, biologicalSex: null, pregnancyStatus: null },
  goals: [],
  conditions: [],
  conditionsOther: "",
  allergies: [],
  allergiesOther: "",
  medications: [],
  dietaryPattern: null,
  consent: false,
};
