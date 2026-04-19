/**
 * POST /api/prostate-cancer-risk
 *
 * Accepts a PCPTInput body and returns a PCPTResult.
 *
 * Optional Supabase persistence schema:
 *
 *   create table prostate_cancer_assessments (
 *     id                  uuid primary key default gen_random_uuid(),
 *     created_at          timestamptz default now(),
 *     age                 int,
 *     race                text,
 *     psa                 numeric,
 *     dre_abnormal        boolean,
 *     any_cancer_risk     numeric,
 *     high_grade_risk     numeric,
 *     risk_category       text
 *   );
 *   alter table prostate_cancer_assessments enable row level security;
 */

import { NextRequest, NextResponse } from "next/server";
import { computePCPTRisk } from "@/lib/pcpt-model/calculator";
import type { PCPTInput } from "@/lib/pcpt-model/types";

export async function POST(req: NextRequest) {
  let body: PCPTInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { psa, age, race, dreAbnormal, familyHistory, priorNegativeBiopsy } =
    body;

  if (
    typeof psa !== "number" ||
    typeof age !== "number" ||
    !race ||
    typeof dreAbnormal !== "boolean" ||
    typeof familyHistory !== "boolean" ||
    typeof priorNegativeBiopsy !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid input fields." },
      { status: 422 },
    );
  }

  let result;
  try {
    result = computePCPTRisk(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── Optional: persist to Supabase (anonymised) ──────────────────────────
  //   const supabase = createServiceRoleClient();
  //     await supabase.from("prostate_cancer_assessments").insert({
  //       age,
  //       race,
  //       psa,
  //       dre_abnormal: dreAbnormal,
  //       any_cancer_risk: result.anyCancerRisk,
  //       high_grade_risk: result.highGradeRisk,
  //       risk_category: result.riskCategory,
  //     });
  //   }
  // ────────────────────────────────────────────────────────────────────────

  return NextResponse.json(result);
}
