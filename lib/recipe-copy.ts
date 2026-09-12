import { z } from "zod";

export const BODY_SYSTEM_TERMS = [
  "cardiovascular", "heart health", "circulatory", "circulation",
  "digestive", "digestion", "gut health", "gastrointestinal",
  "cognitive", "brain health", "neurological", "nervous system",
  "immune", "immunity",
  "respiratory", "lungs",
  "metabolic", "metabolism",
  "liver", "hepatic", "kidney", "renal",
  "musculoskeletal", "joint health",
  "endocrine", "hormonal", "thyroid",
  "blood sugar", "blood glucose", "blood pressure",
  "skin health", "vision", "eye health",
  "organ-system", "body system",
] as const;

const BODY_SYSTEM_RE = new RegExp(
  `\\b(${BODY_SYSTEM_TERMS.map((t) => t.replace(/[-\s]/g, "[-\\s]")).join("|")})`,
  "i",
);

export function mentionsBodySystem(text: string | null | undefined): boolean {
  return !!text && BODY_SYSTEM_RE.test(text);
}

export const INTRO_RULE = `INTRO (short_description): One or two warm, plain sentences describing what the
drink is, how it tastes, and the everyday benefit someone would notice. Do NOT
name specific body systems, organs, or clinical markers — no "cardiovascular",
"digestive", "immune", "cognitive", "metabolic", "blood sugar", "blood
pressure", "liver", "gut health", or similar. Say "keeps you feeling steady
through the afternoon", not "supports cardiovascular and metabolic health".
Save every mechanism and nutrient claim for why_it_works.`;

export const WHY_IT_WORKS_RULE = `WHY IT WORKS (why_it_works): Flowing prose, NOT a list and NOT headed sections.

Cover every MAIN ingredient — skip water, ice, and pure garnishes. For each one,
give between 3 and 5 distinct functions: what it contributes and what it does,
grounded in established nutrition science. Body systems and mechanisms ARE
allowed here; this is the section where the mechanism belongs.

Structure it as 2-4 paragraphs separated by a blank line. Name each ingredient
inside the sentence that describes it — never as a heading or a label on its own
line, and never as a bullet. Group related ingredients into the same paragraph
when they act through the same pathway.

Write it the way you would explain it aloud: "The milk provides tryptophan, an
amino acid essential for serotonin synthesis, which then converts to melatonin,
a hormone crucial for regulating sleep cycles."

Do not repeat the same function across ingredients, and do not pad to reach
three — if an ingredient genuinely has only a couple of established functions,
describe a different main ingredient instead.`;



export function whyItWorksIssues(text: string | null | undefined): string[] {
  const issues: string[] = [];
  const body = (text ?? "").trim();

  if (!body) return ["empty"];

  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);

  if (lines.some((l) => /^[•\-*\u2022]/.test(l))) issues.push("bullets");

  if (lines.some((l) => /^\*{0,2}[A-Z][A-Za-z'’\- ]{1,30}\*{0,2}:?$/.test(l))) {
    issues.push("headings");
  }
  if (/\*\*/.test(body)) issues.push("markdown");

  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length < 2) issues.push("single-paragraph");

  return issues;
}
