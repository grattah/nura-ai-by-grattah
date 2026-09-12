import { PCPTInput, PCPTResult } from "./types";

interface CoefficientSet {
  readonly intercept: number;
  readonly log2psa: number;
  readonly dreAbnormal: number;
  readonly africanAmerican: number;
  readonly familyHistory: number;
  readonly priorNegBiopsy: number;
  readonly age: number;
}

const COEFF = {
  L: {
    intercept: -6.4737,
    log2psa: 0.649,
    dreAbnormal: 0.3648,
    africanAmerican: 0.7648,
    familyHistory: 0.3697,
    priorNegBiopsy: -0.7479,
    age: 0.0289,
  },
  H: {
    intercept: -8.1284,
    log2psa: 1.0145,
    dreAbnormal: 0.7374,
    africanAmerican: 0.6736,
    familyHistory: 0.2483,
    priorNegBiopsy: -0.4432,
    age: 0.0389,
  },
} as const;

function linearPredictor(coeffs: CoefficientSet, input: PCPTInput): number {
  const log2psa = Math.log2(Math.max(input.psa, 0.01));
  const aa = input.race === "black" ? 1 : 0;

  return (
    coeffs.intercept +
    coeffs.log2psa * log2psa +
    coeffs.dreAbnormal * (input.dreAbnormal ? 1 : 0) +
    coeffs.africanAmerican * aa +
    coeffs.familyHistory * (input.familyHistory ? 1 : 0) +
    coeffs.priorNegBiopsy * (input.priorNegativeBiopsy ? 1 : 0) +
    coeffs.age * input.age
  );
}

function softmax(xL: number, xH: number): [number, number, number] {
  const eRef = 1;
  const eL = Math.exp(xL);
  const eH = Math.exp(xH);
  const sum = eRef + eL + eH;
  return [eRef / sum, eL / sum, eH / sum];
}

/** Computes PCPTRC 2.0 prostate cancer risk. */
export function computePCPTRisk(input: PCPTInput): PCPTResult {
  if (input.psa < 0.1 || input.psa > 50) {
    throw new RangeError("PSA must be between 0.1 and 50 ng/mL.");
  }
  if (input.age < 40 || input.age > 80) {
    throw new RangeError("Age must be between 40 and 80.");
  }

  const xL = linearPredictor(COEFF.L, input);
  const xH = linearPredictor(COEFF.H, input);
  const [pNo, pLow, pHigh] = softmax(xL, xH);

  const anyCancerRisk = pLow + pHigh;

  let riskCategory: PCPTResult["riskCategory"];
  if (anyCancerRisk >= 0.5) riskCategory = "very_high";
  else if (anyCancerRisk >= 0.3) riskCategory = "high";
  else if (anyCancerRisk >= 0.15) riskCategory = "moderate";
  else riskCategory = "low";

  const biopsyDiscussionRecommended = anyCancerRisk >= 0.2 || pHigh >= 0.05;

  return {
    anyCancerRisk,
    lowGradeRisk: pLow,
    highGradeRisk: pHigh,
    noCancerRisk: pNo,
    riskCategory,
    biopsyDiscussionRecommended,
  };
}
