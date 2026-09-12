export type Race =
  | "white"
  | "black"
  | "hispanic"
  | "asian_pacific_islander"
  | "american_indian_alaska_native";

export type MenarcheAge = "gte14" | "12to13" | "lte11";

export type FirstBirthAge =
  | "lt20"
  | "20to24"
  | "25to29"
  | "gte30"
  | "nulliparous";

export type BiopsyCount = 0 | 1 | 2;
export type AffectedRelatives = 0 | 1 | 2;
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
