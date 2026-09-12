export interface BasicProfile {
  ageRange: string | null;
  biologicalSex: string | null;
  pregnancyStatus: string | null;
}

export interface Medication {
  name: string;
  rxcui: string | null;
}

export interface HealthProfileDraft {
  basic: BasicProfile;
  goals: string[];
  conditions: string[];
  conditionsOther: string;
  allergies: string[];
  allergiesOther: string;
  medications: Medication[];
  consent: boolean;
  consentVersion: string | null;
}

export type ProfileSection =
  | "goals"
  | "conditions"
  | "allergies"
  | "medications";
// | "dietary";

export const STEP_ORDER = [
  "basic",
  "goals",
  "conditions",
  "allergies",
  "medications",
  "review",
] as const;
export type Step = (typeof STEP_ORDER)[number];

/** True when the profile holds data that requires explicit consent. */
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
  consent: false,
  consentVersion: null,
};
