import {
  AGE_RANGES,
  BIOLOGICAL_SEX,
  CONDITIONS,
  ALLERGENS,
  GOALS,
  labelFor,
  labelsFor,
} from "./options";
import { type HealthProfileDraft } from "./types";

const PREGNANCY_SUMMARY: Record<string, string> = {
  yes: "Pregnant / breastfeeding",
  no: "Not pregnant",
  "prefer-not-to-say": "Prefer not to say",
};

const EMPTY = "Not added";

function join(labels: string[], other: string, fallback = EMPTY): string {
  const all = [...labels];
  if (other.trim()) all.push(other.trim());
  return all.length ? all.join(", ") : fallback;
}

export function summarizeBasic(d: HealthProfileDraft): string {
  const { ageRange, biologicalSex, pregnancyStatus } = d.basic;
  const parts = [
    ageRange ? labelFor(AGE_RANGES, ageRange) : null,
    biologicalSex ? labelFor(BIOLOGICAL_SEX, biologicalSex) : null,
    pregnancyStatus ? PREGNANCY_SUMMARY[pregnancyStatus] : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : EMPTY;
}

export function summarizeGoals(d: HealthProfileDraft): string {
  return join(labelsFor(GOALS, d.goals), "");
}

export function summarizeConditions(d: HealthProfileDraft): string {
  return join(labelsFor(CONDITIONS, d.conditions), d.conditionsOther);
}

export function summarizeAllergies(d: HealthProfileDraft): string {
  return join(labelsFor(ALLERGENS, d.allergies), d.allergiesOther, "None");
}

export function summarizeMedications(d: HealthProfileDraft): string {
  return d.medications.length
    ? d.medications.map((m) => m.name).join(", ")
    : "None";
}

// summarizeDietary removed with the dietary-pattern step (see types.ts). Restore
// alongside HealthProfileDraft.dietaryPattern if the step is reinstated.
