import { GailModelInput, GailModelResult, Race } from "./types";
import {
  H1_WHITE,
  H1_BLACK,
  H1_HISPANIC,
  H1_ASIAN,
  H2_COMPETING,
  RR_WHITE_HISPANIC,
  RR_BLACK_CARE,
  RR_ASIAN_AABCS,
} from "./tables";

const AGE_INTERVAL_START = 20;
const INTERVAL_WIDTH = 5;
const MAX_AGE = 90;

export function computeRelativeRisk(input: GailModelInput): number {
  const {
    race,
    menarcheAge,
    firstBirthAge,
    affectedRelatives,
    biopsyCount,
    atypicalHyperplasia,
    currentAge,
  } = input;
  let rr = 1.0;

  if (
    race === "white" ||
    race === "hispanic" ||
    race === "american_indian_alaska_native"
  ) {
    rr *= RR_WHITE_HISPANIC.menarche[menarcheAge];
    const table =
      currentAge < 50
        ? RR_WHITE_HISPANIC.biopsy.under50
        : RR_WHITE_HISPANIC.biopsy.over50;
    rr *= table[biopsyCount];
    if (biopsyCount > 0) rr *= RR_WHITE_HISPANIC.atypical[atypicalHyperplasia];

    // Matrix Interaction
    const matrix = RR_WHITE_HISPANIC.birth_relatives[firstBirthAge];
    rr *= matrix[affectedRelatives];
  } else if (race === "black") {
    rr *= RR_BLACK_CARE.menarche[menarcheAge];
    const table =
      currentAge < 50
        ? RR_BLACK_CARE.biopsy.under50
        : RR_BLACK_CARE.biopsy.over50;
    rr *= table[biopsyCount];
    rr *= RR_BLACK_CARE.relatives[affectedRelatives];
    rr *= RR_BLACK_CARE.birth_age[firstBirthAge];
  } else if (race === "asian_pacific_islander") {
    rr *= RR_ASIAN_AABCS.menarche[menarcheAge];
    rr *= RR_ASIAN_AABCS.biopsy[biopsyCount];
    rr *= RR_ASIAN_AABCS.relatives[affectedRelatives];
    rr *= RR_ASIAN_AABCS.birth_age[firstBirthAge];
  }

  return rr;
}

function absoluteRisk(
  t1: number,
  t2: number,
  rr: number,
  h1: readonly number[],
  h2: readonly number[],
): number {
  let risk = 0;
  let cumulativeHazard = 0;

  for (let j = 0; j < 14; j++) {
    const bandStart = AGE_INTERVAL_START + j * INTERVAL_WIDTH;
    const bandEnd = bandStart + INTERVAL_WIDTH;
    const dt = Math.max(0, Math.min(t2, bandEnd) - Math.max(t1, bandStart));

    if (dt <= 0) continue;

    const l1 = h1[j];
    const l2 = h2[j];
    const totalHazard = rr * l1 + l2;
    const survival = Math.exp(-cumulativeHazard);

    risk +=
      ((rr * l1) / totalHazard) * survival * (1 - Math.exp(-totalHazard * dt));
    cumulativeHazard += totalHazard * dt;
  }

  return risk;
}

export function computeGailRisk(input: GailModelInput): GailModelResult {
  if (input.currentAge < 35 || input.currentAge > 85) {
    throw new Error("Patient must be between 35 and 85.");
  }

  const h1Map: Record<Race, readonly number[]> = {
    white: H1_WHITE,
    black: H1_BLACK,
    hispanic: H1_HISPANIC,
    asian_pacific_islander: H1_ASIAN,
    american_indian_alaska_native: H1_WHITE,
  };

  const h1 = h1Map[input.race];
  const h2 = H2_COMPETING;
  const rr = computeRelativeRisk(input);

  const fiveYearRisk = absoluteRisk(
    input.currentAge,
    input.currentAge + 5,
    rr,
    h1,
    h2,
  );
  const lifetimeRisk = absoluteRisk(input.currentAge, MAX_AGE, rr, h1, h2);
  const avgFiveYear = absoluteRisk(
    input.currentAge,
    input.currentAge + 5,
    1.0,
    h1,
    h2,
  );
  const avgLifetime = absoluteRisk(input.currentAge, MAX_AGE, 1.0, h1, h2);

  let riskCategory: GailModelResult["riskCategory"] = "average";
  if (fiveYearRisk >= 0.0167) riskCategory = "high";
  if (fiveYearRisk >= 0.03) riskCategory = "very_high";
  if (fiveYearRisk < avgFiveYear * 0.8) riskCategory = "low";

  return {
    fiveYearRisk,
    lifetimeRisk,
    averageFiveYearRisk: avgFiveYear,
    averageLifetimeRisk: avgLifetime,
    relativeRisk: rr,
    riskCategory,
  };
}
