// PCPTRC 2.0 — Thompson IM et al., J Urol 2012;188(4):1185–90.

export interface PCPTInput {
  psa: number;

  age: number;

  race: "white" | "black" | "other";

  dreAbnormal: boolean;

  familyHistory: boolean;

  priorNegativeBiopsy: boolean;
}

export interface PCPTResult {
  anyCancerRisk: number;
  lowGradeRisk: number;
  highGradeRisk: number;
  noCancerRisk: number;
  riskCategory: "low" | "moderate" | "high" | "very_high";
  biopsyDiscussionRecommended: boolean;
}
