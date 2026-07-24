"use client";

import { Check, CircleX } from "lucide-react";
import {
  type Option,
  type GoalOption,
  DietaryOption,
} from "@/lib/health-profile/options";

// ── Segmented single-select (age range, sex, pregnancy) ─────────────────────
export function OptionGroup({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: Option[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  const hasLongThirdOptions =
    options.length >= 3 &&
    options
      .filter((_, i) => (i + 1) % 3 === 0)
      .every((o) => o.label.length > 8);
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-base-text">{label}</h2>
        {hint && <p className="text-sm text-subtle mt-1.5">{hint}</p>}
      </div>
      <div
        className={`grid gap-2 ${
          hasLongThirdOptions ? "grid-cols-[1fr_1fr_auto]" : "grid-cols-3"
        }`}
      >
        {options.map((o) => {
          const active = value === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className={`p-4 rounded-xl-5 border-[1.5px] text-sm font-semibold transition-colors ${
                active
                  ? "border-mint-green bg-mint-green/10 text-base-text"
                  : "border-[#E3E1D880] bg-white text-subtle hover:border-mint-green/40"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Multi-select checkbox list (conditions, allergies) ──────────────────────
export function Checklist({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((o) => {
        const active = selected.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onToggle(o.key)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#E8E6DC] text-left hover:opacity-90 transition-opacity"
          >
            <span
              className={`size-5.5 rounded-md grid place-items-center shrink-0 border-2 ${
                active
                  ? "bg-mint-green border-mint-green"
                  : "bg-transparent border-[#9CA5A3]"
              }`}
            >
              {active && (
                <Check className="size-4 text-white" strokeWidth={3} />
              )}
            </span>
            <span className="text-base font-medium text-base-text">
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Single-select radio list (dietary pattern) ──────────────────────────────
export function RadioList({
  options,
  value,
  onChange,
}: {
  options: DietaryOption[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className="w-full flex items-center gap-4 px-3 py-2 rounded-lg bg-[#E8E6DC] text-left hover:opacity-90 transition-opacity"
          >
            <span
              className="size-9 rounded-full grid place-items-center"
              style={{ backgroundColor: o.iconBg }}
            >
              <o.icon className="size-5" style={{ color: o.iconColor }} />
            </span>
            <span className="text-base font-medium text-base-text">
              {o.label}
            </span>
            <span
              className={`size-5 ml-auto rounded-full grid place-items-center shrink-0 border-2 ${
                active ? "border-mint-green" : "border-[#CFCDBF]"
              }`}
            >
              {active && (
                <span className="size-2.5 rounded-full bg-mint-green" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Free-text "Other" input ─────────────────────────────────────────────────
export function OtherInput({
  value,
  onChange,
  placeholder = "Enter anything else",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-base font-medium text-base-text">
        Other (please specify)
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white rounded-xl px-3 py-4 border border-[#9CA5A3] text-base text-foreground outline-none focus:border-mint-green placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ── 14-goal icon grid (multi-select) ────────────────────────────────────────
export function GoalGrid({
  goals,
  selected,
  onToggle,
}: {
  goals: GoalOption[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {goals.map((g, index) => {
        const active = selected.includes(g.key);
        return (
          <button
            key={g.key}
            type="button"
            onClick={() => onToggle(g.key)}
            className={`relative pt-4 px-3 pb-8 bg-card rounded-2xl border flex flex-col items-center justify-center gap-2 transition-colors ${
              active
                ? "border-mint-green"
                : "border-[#EAECE9]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-2 right-2 size-3.5 rounded-[3px] border grid place-items-center transition-colors ${
                active
                  ? "bg-mint-green border-mint-green"
                  : "bg-transparent border-[#CCD1CD]"
              }`}
            >
              {active && (
                <Check className="size-2.5 text-white" strokeWidth={3} />
              )}
            </span>
            <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#F1F7F3]">
              <g.icon className={`size-6 text-mint-green`} strokeWidth={1.75} />
            </div>
            <span className="text-xs font-semibold text-base-text text-center px-1">
              {index + 1}. {g.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Medication editor: free-text add + removable chips ──────────────────────
export function MedicationChips({
  medications,
  onRemove,
}: {
  medications: string[];
  onRemove: (name: string) => void;
}) {
  if (medications.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2.5">
      {medications.map((m) => (
        <span
          key={m}
          className="flex items-center gap-2 pl-4 p-3 rounded-full bg-[#E8E6DC] text-base-text text-sm font-medium"
        >
          {m}
          <button
            type="button"
            onClick={() => onRemove(m)}
            aria-label={`Remove ${m}`}
            className="text-grey-c500 hover:text-base-text transition-colors"
          >
            <CircleX className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
