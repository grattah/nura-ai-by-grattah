"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NuraLogo } from "@/components/nura-logo";
import type { GailModelInput, GailModelResult } from "@/lib/gail-model/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "personal" | "reproductive" | "medical" | "results";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (v: number) => (v * 100).toFixed(1) + "%";

const RISK_META = {
  low: {
    label: "Below average",
    dot: "bg-emerald-500",
    text: "text-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-500",
  },
  average: {
    label: "Average risk",
    dot: "bg-amber-500",
    text: "text-amber-500",
    pill: "bg-amber-500/10 text-amber-500",
  },
  high: {
    label: "Elevated risk",
    dot: "bg-primary",
    text: "text-primary",
    pill: "bg-primary/10 text-primary",
  },
  very_high: {
    label: "High risk",
    dot: "bg-destructive",
    text: "text-destructive",
    pill: "bg-destructive/10 text-destructive",
  },
} as const;

const RECOMMENDATIONS: Record<string, string> = {
  low: "Your estimated risk is below average for your age group. Continue following recommended screening guidelines and discuss any concerns with your doctor.",
  average:
    "Your risk is broadly in line with the average for your age group. Keep up with annual screening as recommended by your healthcare provider.",
  high: "Your 5-year risk exceeds the NCI elevated threshold of 1.67%. Consider discussing more frequent screening, genetic counselling, or preventive options with your doctor.",
  very_high:
    "Your estimated risk is notably elevated. We strongly encourage speaking with a specialist about annual MRI alongside mammography, genetic counselling, and risk-reduction strategies.",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {hint && (
        <p className="text-xs text-muted-foreground/70 leading-snug">{hint}</p>
      )}
      {children}
    </div>
  );
}

function NuraSelect({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: [string | number, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground text-sm border-0 focus:ring-2 focus:ring-ring outline-none cursor-pointer appearance-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='currentColor' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 16px center",
      }}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

function AgeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center bg-muted rounded-2xl overflow-hidden">
      <button
        onClick={() => onChange(Math.max(35, value - 1))}
        className="w-14 h-14 text-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
      >
        −
      </button>
      <span className="flex-1 text-center text-2xl font-bold text-foreground">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(85, value + 1))}
        className="w-14 h-14 text-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
      >
        +
      </button>
    </div>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={[
            "h-1 rounded-full transition-all duration-300",
            i < current
              ? "w-3 bg-primary/40"
              : i === current
                ? "w-6 bg-primary"
                : "w-3 bg-foreground/10",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BreastCancerRiskChecker() {
  const [step, setStep] = useState<Step>("personal");
  const [result, setResult] = useState<GailModelResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<GailModelInput>({
    currentAge: 45,
    race: "white",
    menarcheAge: "12to13",
    firstBirthAge: "20to24",
    affectedRelatives: 0,
    biopsyCount: 0,
    atypicalHyperplasia: "unknown",
  });

  const set =
    <K extends keyof GailModelInput>(key: K) =>
    (value: GailModelInput[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  const stepIndex = { personal: 0, reproductive: 1, medical: 2, results: 3 };

  const handleCalculate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/breast-cancer-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Calculation failed.");
      }
      const data: GailModelResult = await res.json();
      setResult(data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep("personal");
    setResult(null);
    setError(null);
  };

  const currentIdx = stepIndex[step];
  const meta = result ? RISK_META[result.riskCategory] : null;
  const rrBarWidth = result
    ? Math.min((result.relativeRisk / 8) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto pb-20">
        <div className="px-4 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <NuraLogo size="sm" variant="full" />
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary tracking-wide">
              Gail Model
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1 leading-tight">
            {step === "results" ? "Your results" : "Breast Cancer Risk"}
          </h1>
          <p className="text-sm text-muted-foreground leading-snug">
            {step === "personal" &&
              "Estimate your 5-year and lifetime risk using the validated Gail model."}
            {step === "reproductive" &&
              "Your menstrual and birth history affect baseline risk."}
            {step === "medical" &&
              "Family and biopsy history are key risk factors."}
            {step === "results" &&
              "Based on your answers — Gail Model estimate."}
          </p>

          {step !== "results" && (
            <div className="mt-4 space-y-1.5">
              <StepDots current={currentIdx} />
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
                Step {currentIdx + 1} of 3
              </p>
            </div>
          )}
        </div>

        <div className="px-4 space-y-5">
          {step === "personal" && (
            <Card className="border-0 rounded-3xl shadow-none bg-card">
              <CardContent className="p-5 space-y-5">
                <Field
                  label="Current age"
                  hint="The Gail model is validated for women aged 35 to 85."
                >
                  <AgeControl
                    value={form.currentAge}
                    onChange={set("currentAge")}
                  />
                </Field>
                <Field
                  label="Race / ethnicity"
                  hint="Used to select age-specific baseline incidence rates."
                >
                  <NuraSelect
                    value={form.race}
                    onChange={set("race") as (v: string) => void}
                    options={[
                      ["white", "White (non-Hispanic)"],
                      ["black", "Black / African American"],
                      ["hispanic", "Hispanic"],
                      ["asian_pacific_islander", "Asian / Pacific Islander"],
                      [
                        "american_indian_alaska_native",
                        "American Indian / Alaska Native",
                      ],
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {step === "reproductive" && (
            <Card className="border-0 rounded-3xl shadow-none bg-card">
              <CardContent className="p-5 space-y-5">
                <Field label="Age at first menstrual period">
                  <NuraSelect
                    value={form.menarcheAge}
                    onChange={set("menarcheAge") as (v: string) => void}
                    options={[
                      ["gte14", "14 years or older"],
                      ["12to13", "12 or 13 years old"],
                      ["lte11", "11 years or younger"],
                    ]}
                  />
                </Field>
                <Field label="Age at first live birth">
                  <NuraSelect
                    value={form.firstBirthAge}
                    onChange={set("firstBirthAge") as (v: string) => void}
                    options={[
                      ["lt20", "Younger than 20"],
                      ["20to24", "20 – 24 years old"],
                      ["25to29", "25 – 29 years old"],
                      ["gte30", "30 years or older"],
                      ["nulliparous", "No live birth (Nulliparous)"],
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {step === "medical" && (
            <Card className="border-0 rounded-3xl shadow-none bg-card">
              <CardContent className="p-5 space-y-5">
                <Field
                  label="First-degree relatives with breast cancer"
                  hint="Mother, sisters, or daughters diagnosed with breast cancer."
                >
                  <NuraSelect
                    value={form.affectedRelatives}
                    onChange={(v) => set("affectedRelatives")(+v as 0 | 1 | 2)}
                    options={[
                      [0, "None"],
                      [1, "1 relative"],
                      [2, "2 or more relatives"],
                    ]}
                  />
                </Field>
                <Field label="Number of prior breast biopsies">
                  <NuraSelect
                    value={form.biopsyCount}
                    onChange={(v) => set("biopsyCount")(+v as 0 | 1 | 2)}
                    options={[
                      [0, "None"],
                      [1, "1 biopsy"],
                      [2, "2 or more biopsies"],
                    ]}
                  />
                </Field>
                {form.biopsyCount > 0 && (
                  <Field label="Atypical hyperplasia in any biopsy">
                    <NuraSelect
                      value={form.atypicalHyperplasia}
                      onChange={
                        set("atypicalHyperplasia") as (v: string) => void
                      }
                      options={[
                        ["unknown", "Unknown / not tested"],
                        ["absent", "Not present"],
                        ["present", "Present"],
                      ]}
                    />
                  </Field>
                )}
                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {step === "results" && result && meta && (
            <>
              <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-primary text-primary-foreground">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
                        5-year absolute risk
                      </p>
                      <p className="text-5xl font-bold leading-none tracking-tight mb-3">
                        {pct(result.fiveYearRisk)}
                      </p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-background/20 text-primary-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/60" />
                        {meta.label}
                      </span>
                    </div>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 mt-1 bg-secondary text-secondary-foreground">
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 26 26"
                        fill="none"
                      >
                        <path
                          d="M13 4C13 4 8 7 8 11C8 15 13 18 13 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M13 4C13 4 18 7 18 11C18 15 13 18 13 18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="opacity-70"
                        />
                        <path
                          d="M13 4V18"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Your 5-yr risk", pct(result.fiveYearRisk), true],
                  ["Avg 5-yr risk", pct(result.averageFiveYearRisk), false],
                  ["Your lifetime", pct(result.lifetimeRisk), true],
                  ["Avg lifetime", pct(result.averageLifetimeRisk), false],
                ].map(([label, value, highlight]) => (
                  <Card
                    key={label as string}
                    className="border-0 rounded-3xl shadow-none bg-card"
                  >
                    <CardContent className="p-4 text-center">
                      <p
                        className={`text-xl font-bold leading-none mb-1 ${highlight ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {value as string}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {label as string}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-0 rounded-3xl shadow-none bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                      Relative risk vs average
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {result.relativeRisk.toFixed(2)}×
                    </p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${rrBarWidth}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 rounded-3xl shadow-none overflow-hidden border-l-4 border-l-primary bg-primary/10">
                <CardContent className="p-5">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {RECOMMENDATIONS[result.riskCategory]}
                  </p>
                </CardContent>
              </Card>

              <Button
                variant="secondary"
                className="w-full rounded-full min-h-13 bg-card text-foreground shadow-none border-0 hover:opacity-80"
                onClick={reset}
              >
                Start over
              </Button>

              <div className="px-1 pb-4">
                <Separator className="mb-4 bg-border" />
                <p className="text-xs text-muted-foreground/60 leading-relaxed text-center">
                  <strong className="text-muted-foreground/80">
                    Educational purposes only.
                  </strong>{" "}
                  This tool does not constitute medical advice or diagnosis. The
                  Gail model has limitations and may be less accurate in some
                  populations. Always consult a qualified healthcare
                  professional.
                </p>
              </div>
            </>
          )}

          {step !== "results" && (
            <div className="flex gap-3 pt-1">
              {step !== "personal" && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setStep(
                      step === "reproductive" ? "personal" : "reproductive",
                    )
                  }
                  className="px-5 min-h-13 rounded-full text-muted-foreground hover:text-foreground border border-border/30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                onClick={
                  step === "personal"
                    ? () => setStep("reproductive")
                    : step === "reproductive"
                      ? () => setStep("medical")
                      : handleCalculate
                }
                disabled={isLoading}
                className="flex-1 min-h-13 rounded-full font-semibold shadow-none border-0 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                {isLoading
                  ? "Calculating…"
                  : step === "medical"
                    ? "Calculate risk →"
                    : "Continue →"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
