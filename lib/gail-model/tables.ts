import {
  MenarcheAge,
  FirstBirthAge,
  AtypicalHyperplasia,
  BiopsyCount,
  AffectedRelatives,
} from "./types";

/** 5-year interval hazard rates (h1) index 0 = 20-24 ... index 13 = 85-89 */
export const H1_WHITE: readonly number[] = [
  0.00016, 0.000319, 0.000828, 0.00164, 0.002857, 0.003406, 0.003897, 0.004088,
  0.004554, 0.004749, 0.004672, 0.004137, 0.003874, 0.003067,
];
export const H1_BLACK: readonly number[] = [
  0.000131, 0.000284, 0.000759, 0.00156, 0.00281, 0.00325, 0.00351, 0.00368,
  0.00395, 0.0041, 0.0039, 0.0035, 0.0032, 0.0025,
];
export const H1_HISPANIC: readonly number[] = [
  0.0001, 0.000219, 0.00057, 0.001156, 0.002011, 0.002444, 0.002685, 0.002867,
  0.003112, 0.003255, 0.0031, 0.00285, 0.0025, 0.00195,
];
export const H1_ASIAN: readonly number[] = [
  0.000078, 0.000182, 0.000492, 0.001015, 0.001925, 0.00224, 0.002512, 0.002735,
  0.002955, 0.00312, 0.00298, 0.00265, 0.00234, 0.00185,
];

/** Competing mortality (h2) */
export const H2_COMPETING: readonly number[] = [
  0.00046, 0.00055, 0.00073, 0.00111, 0.00181, 0.00297, 0.00477, 0.00757,
  0.01192, 0.01862, 0.02939, 0.04712, 0.07697, 0.1293,
];

// --- WHITE / HISPANIC (Gail/HBCS) ---
export const RR_WHITE_HISPANIC = {
  menarche: { gte14: 1.0, "12to13": 1.099, lte11: 1.21 } as Record<
    MenarcheAge,
    number
  >,
  biopsy: {
    under50: { 0: 1.0, 1: 1.702, 2: 2.898 } as Record<BiopsyCount, number>,
    over50: { 0: 1.0, 1: 1.274, 2: 1.619 } as Record<BiopsyCount, number>,
  },
  atypical: { unknown: 1.0, absent: 0.931, present: 1.819 } as Record<
    AtypicalHyperplasia,
    number
  >,
  // Interaction matrix index by first-degree relatives [0, 1, 2+]
  birth_relatives: {
    lt20: [1.0, 2.61, 6.8],
    "20to24": [1.24, 2.68, 5.78],
    "25to29": [1.55, 2.76, 4.91],
    gte30: [1.93, 2.83, 4.17],
    nulliparous: [1.55, 2.76, 4.91], // Nulliparous follows 25-29 in this model
  } as Record<FirstBirthAge, [number, number, number]>,
} as const;

// --- BLACK (CARE) ---
export const RR_BLACK_CARE = {
  menarche: { gte14: 1.0, "12to13": 1.05, lte11: 1.1 } as Record<
    MenarcheAge,
    number
  >,
  biopsy: {
    under50: { 0: 1.0, 1: 1.44, 2: 1.44 } as Record<BiopsyCount, number>,
    over50: { 0: 1.0, 1: 1.2, 2: 1.2 } as Record<BiopsyCount, number>,
  },
  relatives: { 0: 1.0, 1: 2.11, 2: 3.3 } as Record<AffectedRelatives, number>,
  birth_age: {
    lt20: 1.0,
    "20to24": 1.13,
    "25to29": 1.3,
    gte30: 1.4,
    nulliparous: 1.4, // Nulliparous follows >= 30 in this model
  } as Record<FirstBirthAge, number>,
} as const;

// --- ASIAN (AABCS) ---
export const RR_ASIAN_AABCS = {
  menarche: { gte14: 1.0, "12to13": 1.11, lte11: 1.27 } as Record<
    MenarcheAge,
    number
  >,
  biopsy: { 0: 1.0, 1: 1.49, 2: 2.22 } as Record<BiopsyCount, number>,
  relatives: { 0: 1.0, 1: 2.05, 2: 3.6 } as Record<AffectedRelatives, number>,
  birth_age: {
    lt20: 1.0,
    "20to24": 1.22,
    "25to29": 1.49,
    gte30: 1.82,
    nulliparous: 1.82, // Nulliparous follows >= 30 in this model
  } as Record<FirstBirthAge, number>,
} as const;
