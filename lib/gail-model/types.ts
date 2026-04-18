export type Race =
  | "white"
  | "black"
  | "hispanic"
  | "asian_pacific_islander"
  | "american_indian_alaska_native";

export type MenarcheAge = "gte14" | "12to13" | "lte11";

/** * Age at first live birth.
 * "nulliparous" is handled differently by race in the underlying math.
 */
export type FirstBirthAge =
  | "lt20"
  | "20to24"
  | "25to29"
  | "gte30"
  | "nulliparous";

export type BiopsyCount = 0 | 1 | 2; // 2 means "2 or more"
export type AffectedRelatives = 0 | 1 | 2; // first-degree; 2 means "2 or more"
export type AtypicalHyperplasia = "unknown" | "absent" | "present";

export interface GailModelInput {
  currentAge: number;
  race: Race;
  menarcheAge: MenarcheAge;
  firstBirthAge: FirstBirthAge;
  affectedRelatives: AffectedRelatives;
  biopsyCount: BiopsyCount;
  atypicalHyperplasia: AtypicalHyperplasia;
}

export interface GailModelResult {
  fiveYearRisk: number;
  lifetimeRisk: number;
  averageFiveYearRisk: number;
  averageLifetimeRisk: number;
  relativeRisk: number;
  riskCategory: "low" | "average" | "high" | "very_high";
}
