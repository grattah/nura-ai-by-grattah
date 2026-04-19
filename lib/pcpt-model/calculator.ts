/**
 * PCPTRC 2.0 Calculator
 *
 * Uses multinomial logistic regression with three outcome categories:
 *   0 = no cancer (reference)
 *   1 = low-grade cancer  (Gleason < 7)
 *   2 = high-grade cancer (Gleason ≥ 7)
 *
 * Coefficients sourced from the published PCPTRC 2.0 paper:
 *   Thompson IM et al. J Urol 2012;188(4):1185–90
 *   Table 2: Nominal Logistic Regression Model Coefficients
 *
 * PSA is log₂-transformed as per the published model specification.
 *
 * ⚠️  Validate all coefficients against the official R source code before
 *     any clinical deployment:
 *     https://riskcalc.org/PCPTRC/
 */

import { PCPTInput, PCPTResult } from "./types";

// ---------------------------------------------------------------------------
// Published logistic regression coefficients — PCPTRC 2.0
// Source: Thompson IM et al. J Urol 2012;188(4):1185–90, Table 2
//
// Two linear predictors: one for low-grade (L) and one for high-grade (H).
// The third category (no cancer) is the reference, linear predictor = 0.
// ---------------------------------------------------------------------------

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
  // Low-grade cancer (Gleason < 7) vs no cancer
  L: {
    intercept: -6.4737,
    log2psa: 0.649, // OR ≈ 1.57 per doubling of PSA
    dreAbnormal: 0.3648, // OR ≈ 1.44
    africanAmerican: 0.7648, // OR ≈ 2.15
    familyHistory: 0.3697, // OR ≈ 1.45
    priorNegBiopsy: -0.7479, // OR ≈ 0.47
    age: 0.0289, // OR ≈ 1.03 per year
  },
  // High-grade cancer (Gleason ≥ 7) vs no cancer
  H: {
    intercept: -8.1284,
    log2psa: 1.0145, // OR ≈ 2.02 per doubling of PSA
    dreAbnormal: 0.7374, // OR ≈ 2.09
    africanAmerican: 0.6736, // OR ≈ 1.96
    familyHistory: 0.2483, // OR ≈ 1.28
    priorNegBiopsy: -0.4432, // OR ≈ 0.64
    age: 0.0389, // OR ≈ 1.04 per year
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  // exp of each linear predictor; reference (no cancer) has lp = 0
  const eRef = 1;
  const eL = Math.exp(xL);
  const eH = Math.exp(xH);
  const sum = eRef + eL + eH;
  return [eRef / sum, eL / sum, eH / sum];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute PCPTRC 2.0 prostate cancer risk.
 * Returns the probability of each biopsy outcome.
 *
 * @throws if PSA or age is outside the validated range.
 */
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

  // NCI / AUA: biopsy discussion generally recommended above ~20–25% risk
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
