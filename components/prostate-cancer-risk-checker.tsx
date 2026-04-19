"use client";

import { useState } from "react";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NuraLogo } from "@/components/nura-logo";
import type { PCPTInput, PCPTResult } from "@/lib/pcpt-model/types";
import BackButton from "./back-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "personal" | "tests" | "history" | "results";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (v: number) => (v * 100).toFixed(1) + "%";

const RISK_META = {
  low: {
    label: "Low risk",
    text: "text-green-400",
    pill: "bg-green-400/10 text-green-400",
    bar: "bg-green-400",
  },
  moderate: {
    label: "Moderate risk",
    text: "text-yellow-400",
    pill: "bg-yellow-400/10 text-yellow-400",
    bar: "bg-yellow-400",
  },
  high: {
    label: "Elevated risk",
    text: "text-[#E8836A]",
    pill: "bg-[#E8836A]/10 text-[#E8836A]",
    bar: "bg-[#E8836A]",
  },
  very_high: {
    label: "High risk",
    text: "text-red-400",
    pill: "bg-red-400/10 text-red-400",
    bar: "bg-red-400",
  },
} as const;

const RECOMMENDATIONS: Record<string, string> = {
  low: "Your estimated biopsy risk is low. Continue regular check-ups and discuss age-appropriate PSA screening intervals with your doctor.",
  moderate:
    "Your estimated risk is above the low threshold. A conversation with your doctor about biopsy versus active monitoring would be worthwhile.",
  high: "Your estimated risk is elevated. We recommend speaking with a urologist about prostate biopsy and further evaluation.",
  very_high:
    "Your estimated risk is high. Please speak with a urologist promptly about next steps including biopsy.",
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
        <p className="text-xs text-muted-foreground/60 leading-snug italic">
          {hint}
        </p>
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
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238aab8c' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
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
  min = 40,
  max = 80,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center bg-muted rounded-2xl overflow-hidden">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-14 h-14 text-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
      >
        −
      </button>
      <span className="flex-1 text-center text-2xl font-bold text-foreground">
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-14 h-14 text-xl text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
      >
        +
      </button>
    </div>
  );
}

function TogglePair({
  labelA,
  labelB,
  value,
  onChange,
}: {
  labelA: string;
  labelB: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(
        [
          [labelA, false, "border-border/30 hover:border-green-400/50"],
          [labelB, true, "border-border/30 hover:border-[#E8836A]/50"],
        ] as [string, boolean, string][]
      ).map(([label, val, hoverCls]) => (
        <button
          key={label}
          onClick={() => onChange(val)}
          className={[
            "py-4 rounded-2xl text-sm font-semibold transition-all border-2",
            value === val
              ? val
                ? "bg-[#E8836A]/10 border-[#E8836A] text-[#E8836A]"
                : "bg-green-400/10 border-green-400 text-green-400"
              : `bg-muted text-muted-foreground ${hoverCls}`,
          ].join(" ")}
        >
          {label}
        </button>
      ))}
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
              ? "w-3 bg-[#E8836A]/40"
              : i === current
                ? "w-6 bg-[#E8836A]"
                : "w-3 bg-foreground/10",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function RiskBar({
  label,
  value,
  colorClass,
  scale = 1,
}: {
  label: string;
  value: number;
  colorClass: string;
  scale?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          {label}
        </p>
        <p className={`text-sm font-bold ${colorClass}`}>{pct(value)}</p>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass.replace("text-", "bg-")}`}
          style={{ width: `${Math.min(value * scale * 100, 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProstateCancerRiskChecker() {
  const [step, setStep] = useState<Step>("personal");
  const [result, setResult] = useState<PCPTResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [psaInput, setPsaInput] = useState("");

  const [form, setForm] = useState<Omit<PCPTInput, "psa">>({
    age: 60,
    race: "white",
    dreAbnormal: false,
    familyHistory: false,
    priorNegativeBiopsy: false,
  });

  const set =
    <K extends keyof typeof form>(key: K) =>
    (value: (typeof form)[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  const stepIndex: Record<Step, number> = {
    personal: 0,
    tests: 1,
    history: 2,
    results: 3,
  };

  const handleCalculate = async () => {
    const psa = parseFloat(psaInput);
    if (isNaN(psa) || psa < 0.1 || psa > 50) {
      setError("Please enter a valid PSA value between 0.1 and 50 ng/mL.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prostate-cancer-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, psa }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Calculation failed.");
      }
      setResult(await res.json());
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
    setPsaInput("");
  };

  const currentIdx = stepIndex[step];
  const meta = result ? RISK_META[result.riskCategory] : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto pb-20">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <BackButton className="p-0 h-auto text-foreground hover:opacity-70 transition-opacity gap-1 font-normal mb-4" />
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#E8836A]/10 text-[#E8836A] tracking-wide">
              PCPTRC 2.0
            </span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1 leading-tight">
            {step === "results" ? "Your results" : "Prostate Cancer Risk"}
          </h1>
          <p className="text-sm text-muted-foreground leading-snug">
            {step === "personal" &&
              "Estimate biopsy cancer probability using the PCPTRC 2.0 model."}
            {step === "tests" && "Enter your most recent clinical test values."}
            {step === "history" &&
              "Your personal and family background risk factors."}
            {step === "results" &&
              "Based on your inputs — PCPTRC 2.0 estimate."}
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

        <div className="px-4 space-y-4">
          {/* ── Step 1: Personal ────────────────────────────────────── */}
          {step === "personal" && (
            <Card className="border-0 rounded-3xl shadow-none bg-card">
              <CardContent className="p-5 space-y-5">
                <Field
                  label="Current age"
                  hint="The PCPTRC 2.0 is validated for men aged 40 to 80."
                >
                  <AgeControl value={form.age} onChange={set("age")} />
                </Field>
                <Field
                  label="Race / ethnicity"
                  hint="African American men have a higher baseline risk."
                >
                  <NuraSelect
                    value={form.race}
                    onChange={set("race") as (v: string) => void}
                    options={[
                      ["white", "White (non-Hispanic)"],
                      ["black", "Black / African American"],
                      ["other", "Other / prefer not to say"],
                    ]}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Test results ─────────────────────────────────── */}
          {step === "tests" && (
            <>
              {/* Info notice */}
              <div className="flex gap-3 px-1 py-2">
                <AlertCircle className="w-4 h-4 text-[#E8836A] shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-snug">
                  You'll need results from a recent PSA blood test and Digital
                  Rectal Exam. If you don't have these, see your GP first.
                </p>
              </div>

              <Card className="border-0 rounded-3xl shadow-none bg-card">
                <CardContent className="p-5 space-y-5">
                  <Field
                    label="PSA value (ng/mL)"
                    hint="Prostate-Specific Antigen from your most recent blood test."
                  >
                    <div className="flex items-center bg-muted rounded-2xl px-4 gap-3">
                      <input
                        type="number"
                        min="0.1"
                        max="50"
                        step="0.1"
                        value={psaInput}
                        onChange={(e) => setPsaInput(e.target.value)}
                        placeholder="e.g. 2.5"
                        className="flex-1 bg-transparent py-4 text-lg font-bold text-foreground placeholder:text-muted-foreground border-0 focus:ring-0 outline-none"
                      />
                      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        ng/mL
                      </span>
                    </div>
                  </Field>

                  <Field
                    label="Digital Rectal Exam (DRE)"
                    hint="Result from your most recent examination by a doctor."
                  >
                    <TogglePair
                      labelA="Normal"
                      labelB="Abnormal"
                      value={form.dreAbnormal}
                      onChange={set("dreAbnormal")}
                    />
                  </Field>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Step 3: History ──────────────────────────────────────── */}
          {step === "history" && (
            <Card className="border-0 rounded-3xl shadow-none bg-card">
              <CardContent className="p-5 space-y-5">
                <Field
                  label="Family history of prostate cancer"
                  hint="Father, brother, or son diagnosed with prostate cancer."
                >
                  <TogglePair
                    labelA="No"
                    labelB="Yes"
                    value={form.familyHistory}
                    onChange={set("familyHistory")}
                  />
                </Field>

                <Field
                  label="Prior negative prostate biopsy"
                  hint="Have you previously had a biopsy that came back negative?"
                >
                  <TogglePair
                    labelA="No"
                    labelB="Yes"
                    value={form.priorNegativeBiopsy}
                    onChange={set("priorNegativeBiopsy")}
                  />
                </Field>

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Results ───────────────────────────────────────────────── */}
          {step === "results" && result && meta && (
            <>
              {/* Hero */}
              <Card
                className="border-0 rounded-3xl shadow-none overflow-hidden"
                style={{ backgroundColor: "#E8836A" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-foreground/55 mb-1">
                        Any cancer on biopsy
                      </p>
                      <p className="text-5xl font-bold text-foreground/85 leading-none tracking-tight mb-3">
                        {pct(result.anyCancerRisk)}
                      </p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                        {meta.label}
                      </span>
                    </div>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{ backgroundColor: "#5C6B3A" }}
                    >
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 26 26"
                        fill="none"
                      >
                        <path
                          d="M13 4C13 4 8 7 8 11C8 15 13 18 13 18"
                          stroke="#D4C48A"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M13 4C13 4 18 7 18 11C18 15 13 18 13 18"
                          stroke="#C8B878"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M13 4V18"
                          stroke="#D4C48A"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["Any cancer", pct(result.anyCancerRisk), "text-[#E8836A]"],
                    [
                      "No cancer",
                      pct(result.noCancerRisk),
                      "text-muted-foreground",
                    ],
                    ["Low-grade", pct(result.lowGradeRisk), "text-yellow-400"],
                    ["High-grade", pct(result.highGradeRisk), "text-red-400"],
                  ] as [string, string, string][]
                ).map(([label, value, cls]) => (
                  <Card
                    key={label}
                    className="border-0 rounded-3xl shadow-none bg-card"
                  >
                    <CardContent className="p-4 text-center">
                      <p
                        className={`text-xl font-bold leading-none mb-1 ${cls}`}
                      >
                        {value}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Grade bars */}
              <Card className="border-0 rounded-3xl shadow-none bg-card">
                <CardContent className="p-5 space-y-4">
                  <RiskBar
                    label="Low-grade probability"
                    value={result.lowGradeRisk}
                    colorClass="text-yellow-400"
                    scale={2}
                  />
                  <RiskBar
                    label="High-grade probability"
                    value={result.highGradeRisk}
                    colorClass="text-red-400"
                    scale={4}
                  />
                </CardContent>
              </Card>

              {/* Biopsy alert */}
              {result.biopsyDiscussionRecommended && (
                <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-green-400/8 border-green-400/25">
                  <CardContent className="p-5">
                    <p className="text-sm text-foreground/70 leading-relaxed">
                      Based on these inputs,{" "}
                      <strong className="text-foreground/85">
                        discussing prostate biopsy with your doctor is
                        recommended.
                      </strong>{" "}
                      This is a decision-support estimate, not a clinical
                      instruction.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recommendation */}
              <Card
                className="border-0 rounded-3xl shadow-none overflow-hidden"
                style={{
                  borderLeft: "4px solid #E8836A",
                  backgroundColor: "rgba(232,131,106,0.08)",
                }}
              >
                <CardContent className="p-5">
                  <p className="text-sm text-foreground/70 leading-relaxed">
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
                  The PCPTRC 2.0 estimates the probability of cancer{" "}
                  <em>if biopsied</em> — it is not a diagnosis. Accurate results
                  require PSA and DRE values from a healthcare provider. Always
                  consult a urologist before making any clinical decision.
                </p>
              </div>
            </>
          )}

          {/* ── Navigation buttons ────────────────────────────────────── */}
          {step !== "results" && (
            <div className="flex gap-3 pt-1">
              {step !== "personal" && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setStep(step === "tests" ? "personal" : "tests")
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
                    ? () => setStep("tests")
                    : step === "tests"
                      ? () => {
                          const psa = parseFloat(psaInput);
                          if (isNaN(psa) || psa < 0.1 || psa > 50) {
                            setError(
                              "Please enter a valid PSA value between 0.1 and 50 ng/mL.",
                            );
                            return;
                          }
                          setError(null);
                          setStep("history");
                        }
                      : handleCalculate
                }
                disabled={isLoading}
                className="flex-1 min-h-13 rounded-full font-semibold shadow-none border-0 bg-nura-cream text-nura-forest hover:opacity-90 transition-opacity"
              >
                {isLoading
                  ? "Calculating…"
                  : step === "history"
                    ? "Calculate risk →"
                    : "Continue →"}
              </Button>
            </div>
          )}

          {step === "tests" && error && (
            <p className="text-sm text-destructive text-center px-1">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}
