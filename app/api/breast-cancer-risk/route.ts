import { NextRequest, NextResponse } from "next/server";
import { computeGailRisk } from "@/lib/gail-model/calculator";
import type { GailModelInput } from "@/lib/gail-model/types";
// import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  let body: GailModelInput;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Basic validation
  const {
    currentAge,
    race,
    menarcheAge,
    firstBirthAge,
    affectedRelatives,
    biopsyCount,
    atypicalHyperplasia,
  } = body;

  if (
    typeof currentAge !== "number" ||
    !race ||
    !menarcheAge ||
    !firstBirthAge ||
    affectedRelatives === undefined ||
    biopsyCount === undefined ||
    !atypicalHyperplasia
  ) {
    return NextResponse.json(
      { error: "Missing or invalid input fields." },
      { status: 422 },
    );
  }

  let result;
  try {
    result = computeGailRisk(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── Optional: persist to Supabase (anonymised) ──────────────────────────
  // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // if (supabaseUrl && supabaseKey) {
  //   const supabase = createClient(supabaseUrl, supabaseKey);
  //   await supabase.from("breast_cancer_assessments").insert({
  //     current_age: currentAge,
  //     race,
  //     five_year_risk: result.fiveYearRisk,
  //     lifetime_risk: result.lifetimeRisk,
  //     risk_category: result.riskCategory,
  //     relative_risk: result.relativeRisk,
  //   });
  // }

  return NextResponse.json(result);
}
