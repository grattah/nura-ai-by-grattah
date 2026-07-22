"use client";

import { Check } from "lucide-react";
import BackButton from "@/components/back-button";
import { ReviewSection } from "@/components/health-profile/review-section";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import {
  type Step,
  hasSensitiveData,
  isBasicComplete,
} from "@/lib/health-profile/types";
import {
  summarizeBasic,
  summarizeGoals,
  summarizeConditions,
  summarizeAllergies,
  summarizeMedications,
  summarizeDietary,
} from "@/lib/health-profile/summarize";
import Link from "next/link";

const REVIEW = "/health-profile/review";

export default function ReviewStep() {
  const { draft, update, enterEdit, saveProfile, saving } = useHealthProfile();

  const sensitive = hasSensitiveData(draft);
  const canSave = isBasicComplete(draft) && (!sensitive || draft.consent);

  const sections: { title: string; values: string; step: Step }[] = [
    {
      title: "Basic Profile (Required)",
      values: summarizeBasic(draft),
      step: "basic",
    },
    { title: "Health Goals", values: summarizeGoals(draft), step: "goals" },
    {
      title: "Existing Conditions",
      values: summarizeConditions(draft),
      step: "conditions",
    },
    {
      title: "Allergies & Intolerances",
      values: summarizeAllergies(draft),
      step: "allergies",
    },
    {
      title: "Medications & Supplements",
      values: summarizeMedications(draft),
      step: "medications",
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex items-center px-6 pt-5 pb-4 relative shrink-0">
        <BackButton className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity" />
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text">
          Review &amp; Consent
        </h1>
      </div>

      <div className="flex-1 px-6 pb-6 mt-7 overflow-y-auto">
        <p className="text-base text-base-text mb-4">
          Review your selections. You can edit or delete this anytime in
          Settings.
        </p>

        <div className="mt-2">
          {sections.map((s) => (
            <ReviewSection
              key={s.step}
              title={s.title}
              values={s.values}
              onEdit={() => enterEdit(s.step, REVIEW)}
            />
          ))}
        </div>

        {sensitive && (
          <label className="mt-6 flex items-start gap-3 rounded-2xl bg-[#E6ECEA] p-4 cursor-pointer">
            <span
              className={`mt-0.5 size-5.5 rounded-md grid place-items-center shrink-0 border-2 ${
                draft.consent
                  ? "bg-mint-green border-mint-green"
                  : "bg-transparent border-[#9CA5A3]"
              }`}
            >
              {draft.consent && (
                <Check className="size-4 text-white" strokeWidth={3} />
              )}
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={draft.consent}
              onChange={(e) => update({ consent: e.target.checked })}
            />
            <div className="flex flex-col gap-y-2">
              <span className="text-sm text-base-text">
                I consent to Nuko collecting and storing my health profile data
                (sections 2.3–2.5) to personalize my experience and keep me
                safe.
              </span>
              <Link
                href="/terms-and-privacy"
                className="text-sm font-medium text-mint-green underline"
              >
                Learn more about how we protect your data.
              </Link>
            </div>
          </label>
        )}
      </div>

      <div className="shrink-0 px-6 pt-3 pb-8 bg-background">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={saveProfile}
          className="w-full py-4 rounded-full bg-mint-green text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
