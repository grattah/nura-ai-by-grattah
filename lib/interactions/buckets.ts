export type Bucket =
  | "cyp3a4_substrate"
  | "additive_hmgcoa"
  | "anticoagulant_antiplatelet"
  | "vitamin_k"
  | "serotonergic"
  | "tyramine_maoi"
  | "additive_hypoglycemic"
  | "additive_hypotensive"
  | "hyperkalemia"
  | "ace_cough"
  | "sympathomimetic_bp"
  | "cns_depression"
  | "immune_stimulation"
  | "disulfiram"
  | "thyroid"
  | "seizure_threshold"
  | "estrogenic"
  | "chelation_absorption"
  | "potassium_loss_glycoside";

interface BucketRule {
  epc?: string[];
  pe?: string[];
  atc?: string[];
  curatedSubstrate?: boolean;
}

export const CYP3A4_SUBSTRATE_CLASSES = [
  "HMG-CoA Reductase Inhibitor",
  "Dihydropyridine Calcium Channel Blocker",
  "Calcium Channel Blocker",
  "Benzodiazepine",
  "Calcineurin Inhibitor",
  "Immunosuppressant",
  "Macrolide Antimicrobial",
  "HIV Protease Inhibitor",
];

export const BUCKET_MATCH: Record<Bucket, BucketRule> = {
  cyp3a4_substrate: { curatedSubstrate: true },
  additive_hmgcoa: { epc: ["HMG-CoA Reductase Inhibitor"] },
  anticoagulant_antiplatelet: {
    epc: [
      "Vitamin K Antagonist",
      "Factor Xa Inhibitor",
      "Platelet Aggregation Inhibitor",
      "Thrombin Inhibitor",
      "P2Y12 Platelet Inhibitor",
      "Heparin",
    ],
    pe: ["Decreased Coagulation Factor Activity", "Decreased Platelet Aggregation"],
    atc: [
      "Vitamin K antagonists",
      "Direct factor Xa inhibitors",
      "Platelet aggregation inhibitors excl. heparin",
      "Direct thrombin inhibitors",
    ],
  },
  vitamin_k: { epc: ["Vitamin K Antagonist"], atc: ["Vitamin K antagonists"] },
  serotonergic: {
    epc: [
      "Serotonin Reuptake Inhibitor",
      "Serotonin and Norepinephrine Reuptake Inhibitor",
      "Monoamine Oxidase Inhibitor",
      "Tricyclic Antidepressant",
    ],
    pe: ["Increased Central Nervous System Serotonin Activity"],
    atc: ["Selective serotonin reuptake inhibitors"],
  },
  tyramine_maoi: {
    epc: ["Monoamine Oxidase Inhibitor"],
    atc: ["Monoamine oxidase inhibitors"],
  },
  additive_hypoglycemic: {
    epc: ["Biguanide", "Sulfonylurea", "Insulin", "Thiazolidinedione"],
    pe: ["Decreased Gluconeogenesis", "Increased Glucose Transport into Cells"],
    atc: ["Biguanides", "Sulfonylureas", "Blood glucose lowering"],
  },
  additive_hypotensive: {
    pe: ["Decreased Blood Pressure"],
  },
  hyperkalemia: {
    epc: [
      "Angiotensin Converting Enzyme Inhibitor",
      "Angiotensin 2 Receptor Blocker",
      "Potassium Sparing Diuretic",
      "Aldosterone Antagonist",
    ],
    pe: ["Decreased Renal K+ Excretion"],
  },
  ace_cough: { epc: ["Angiotensin Converting Enzyme Inhibitor"] },
  sympathomimetic_bp: {
    pe: ["Decreased Blood Pressure"],
    epc: ["Monoamine Oxidase Inhibitor"],
  },
  cns_depression: {
    epc: [
      "Benzodiazepine",
      "Opioid Agonist",
      "Barbiturate",
      "Central Nervous System Depressant",
    ],
    atc: ["Opioids", "Benzodiazepine", "Hypnotics and sedatives"],
  },
  immune_stimulation: {
    epc: ["Immunosuppressant", "Calcineurin Inhibitor"],
    atc: ["immunosuppressant", "Calcineurin inhibitors"],
  },
  disulfiram: {
    epc: ["Nitroimidazole Antimicrobial"],
    atc: ["Nitroimidazole derivatives"],
  },
  thyroid: { epc: ["l-Thyroxine"], atc: ["Thyroid hormones"] },
  seizure_threshold: {
    epc: ["Anti-epileptic Agent"],
    atc: ["Antiepileptics"],
  },
  estrogenic: {
    epc: ["Estrogen", "Estrogen Receptor Antagonist"],
    atc: ["Estrogens", "Hormonal contraceptives"],
  },
  chelation_absorption: {
    epc: ["l-Thyroxine", "Fluoroquinolone", "Quinolone", "Tetracycline"],
    atc: ["Thyroid hormones", "Fluoroquinolones", "Tetracyclines", "Quinolone antibacterials"],
  },
  potassium_loss_glycoside: {
    epc: ["Cardiac Glycoside"],
    atc: ["Digitalis glycosides"],
  },
};

function anyMatch(classNames: string[], needles?: string[]): boolean {
  if (!needles?.length) return false;
  const lower = classNames.map((c) => c.toLowerCase());
  return needles.some((n) => {
    const nn = n.toLowerCase();
    return lower.some((c) => c.includes(nn));
  });
}

/** Interaction buckets a drug falls into, from its RxClass classes. */
export function deriveBuckets(classNames: string[]): Bucket[] {
  const out: Bucket[] = [];
  for (const [bucket, rule] of Object.entries(BUCKET_MATCH) as [
    Bucket,
    BucketRule,
  ][]) {
    const hit = rule.curatedSubstrate
      ? anyMatch(classNames, CYP3A4_SUBSTRATE_CLASSES)
      : anyMatch(classNames, rule.epc) ||
        anyMatch(classNames, rule.pe) ||
        anyMatch(classNames, rule.atc);
    if (hit) out.push(bucket);
  }
  return out;
}
