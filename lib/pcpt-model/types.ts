/**
 * PCPTRC 2.0 — Prostate Cancer Prevention Trial Risk Calculator
 *
 * Reference:
 *   Thompson IM et al. J Urol 2012;188(4):1185–90
 *   Original PCPTRC: Thompson IM et al. JAMA 2006;294(11):1369–76
 *
 * This model predicts the probability of finding prostate cancer
 * IF a biopsy were performed today. It is NOT a lifetime risk model.
 *
 * Inputs required:
 *   PSA value (from a recent blood test)
 *   Digital Rectal Exam result (from a doctor)
 *   Age, race, family history, prior biopsy history
 *
 * ⚠️  Always include a medical disclaimer — this is a decision-support
 *     tool for use alongside physician consultation, not a diagnosis.
 */

export interface PCPTInput {
  /** PSA value in ng/mL (must be 0.1–50). From a recent blood test. */
  psa: number;

  /** Age in years (valid range: 40–80) */
  age: number;

  /** Race — affects baseline risk */
  race: "white" | "black" | "other";

  /** Digital Rectal Exam result — abnormal = suspicious findings */
  dreAbnormal: boolean;

  /** Father, brother, or son diagnosed with prostate cancer */
  familyHistory: boolean;

  /** Has the patient had at least one prior prostate biopsy that was negative? */
  priorNegativeBiopsy: boolean;
}

export interface PCPTResult {
  /** Probability of any prostate cancer on biopsy (0–1) */
  anyCancerRisk: number;
  /** Probability of low-grade cancer (Gleason < 7) on biopsy (0–1) */
  lowGradeRisk: number;
  /** Probability of high-grade cancer (Gleason ≥ 7) on biopsy (0–1) */
  highGradeRisk: number;
  /** Probability of no cancer on biopsy (0–1) */
  noCancerRisk: number;
  /** Risk tier for overall cancer */
  riskCategory: "low" | "moderate" | "high" | "very_high";
  /** Whether biopsy discussion with a doctor is recommended based on risk */
  biopsyDiscussionRecommended: boolean;
}
