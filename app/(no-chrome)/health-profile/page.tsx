"use client";

import {
  Shield,
  Lock,
  Sparkles,
  ChevronRight,
  Trash2,
  User,
  CircleX,
  AlertTriangle,
  Pill,
  Leaf,
  CloudLightning,
} from "lucide-react";
import BackButton from "@/components/back-button";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { type ProfileSection, type Step } from "@/lib/health-profile/types";
import {
  summarizeBasic,
  summarizeGoals,
  summarizeConditions,
  summarizeAllergies,
  summarizeMedications,
  summarizeDietary,
} from "@/lib/health-profile/summarize";
import Stepper from "@/components/health-profile/stepper";

const BASE = "/health-profile";

export default function HealthProfilePage() {
  const { exists } = useHealthProfile();
  return exists ? <PopulatedView /> : <Intro />;
}

// ── Intro (no profile yet) ──────────────────────────────────────────────────
function Intro() {
  const { startOnboarding } = useHealthProfile();

  const benefits = [
    {
      icon: <Shield className="size-5 text-mint-green" />,
      title: "Optional & private",
      body: "You're in control. Skip anything you prefer not to share.",
    },
    {
      icon: <Lock className="size-5 text-mint-green" />,
      title: "Safety first",
      body: "Allergies, medications & celiac disease help keep you safe.",
    },
    {
      icon: <Sparkles className="size-5 text-mint-green" />,
      title: "Personalized for you",
      body: "Your goals & conditions help us personalize recommendations and your nutrition score.",
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex items-center px-6 pt-5 pb-4 relative shrink-0">
        <BackButton
          backPage="/account"
          className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
        />
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text">
          Health profile
        </h1>
      </div>

      <div className="flex-1 px-6 pt-4 overflow-y-auto">
        <Stepper currentStep={2} totalSteps={3} />
        <h2 className="text-hp-title font-semibold text-base-text leading-tight mt-5">
          Let&apos;s build <br />
          <span className="text-mint-green">your health profile</span>
        </h2>
        <p className="text-base text-subtle mt-3 leading-5.5">
          This helps us personalize your nutrition score and flag anything that
          may not be safe for you.
        </p>

        <div className="mt-8 space-y-6">
          {benefits.map((b) => (
            <div key={b.title} className="flex items-start gap-4">
              <span className="size-11 rounded-xl bg-[#E8E6DC] grid place-items-center shrink-0">
                {b.icon}
              </span>
              <div>
                <p className="text-base font-semibold text-base-text">
                  {b.title}
                </p>
                <p className="text-sm text-subtle leading-5 mt-1">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-6 pt-3 pb-8 bg-background">
        <button
          type="button"
          onClick={startOnboarding}
          className="w-full py-4 rounded-full bg-mint-green text-white text-base font-medium hover:opacity-90 transition-opacity"
        >
          Get started
        </button>
        <p className="text-center text-sm text-subtle mt-3">
          You can edit this anytime in settings
        </p>
      </div>
    </div>
  );
}

// ── Populated view (profile exists) ─────────────────────────────────────────
function PopulatedView() {
  const { draft, enterEdit, removeSection, removeProfile, saving } =
    useHealthProfile();

  const rows: {
    step: Step;
    section?: ProfileSection;
    icon: React.ReactNode;
    title: string;
    values: string;
    iconBg: string;
  }[] = [
    {
      step: "basic",
      icon: <User className="size-5 text-[#0D9488]" strokeWidth={2} />,
      iconBg: "#0D94881A",
      title: "Basic Profile",
      values: summarizeBasic(draft),
    },
    {
      step: "goals",
      section: "goals",
      icon: (
        <CloudLightning className="size-5 text-[#F97316]" strokeWidth={2} />
      ),
      iconBg: "#F973161A",
      title: "Health Goals",
      values: summarizeGoals(draft),
    },
    {
      step: "conditions",
      section: "conditions",
      icon: <CircleX className="size-5 text-[#0F766E]" strokeWidth={2} />,
      iconBg: "#0F766E1A",
      title: "Existing Conditions",
      values: summarizeConditions(draft),
    },
    {
      step: "allergies",
      section: "allergies",
      icon: <AlertTriangle className="size-5 text-[#EF4444]" strokeWidth={2} />,
      iconBg: "#EF44441A",
      title: "Allergies & Intolerances",
      values: summarizeAllergies(draft),
    },
    {
      step: "medications",
      section: "medications",
      icon: <Pill className="size-5 text-[#8B5CF6]" strokeWidth={2} />,
      iconBg: "#8B5CF61A",
      title: "Medications & Supplements",
      values: summarizeMedications(draft),
    },
    {
      step: "dietary",
      section: "dietary",
      icon: <Leaf className="size-5 text-[#0D9488]" strokeWidth={2} />,
      iconBg: "#0D94881A",
      title: "Dietary Pattern",
      values: summarizeDietary(draft),
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex items-center px-6 pt-5 pb-4 relative shrink-0">
        <BackButton
          backPage="/account"
          className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
        />
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-xl font-semibold text-base-text">
            Health profile
          </h1>
          <p className="text-sm text-subtle font-medium mt-1">
            Your data is private and encrypted
          </p>
        </div>
      </div>

      <div className="flex-1 px-6 pt-2 mt-4 pb-6 overflow-y-auto space-y-8">
        {rows.map((r) => (
          <div key={r.step} className="flex items-center">
            <button
              type="button"
              onClick={() => enterEdit(r.step, BASE)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
            >
              <span
                style={{ backgroundColor: r.iconBg }}
                className="size-11 rounded-xl grid place-items-center shrink-0"
              >
                {r.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-base-text">
                  {r.title}
                </span>
                <span className="block text-sm text-subtle truncate">
                  {r.values}
                </span>
              </span>
            </button>
            {r.section && (
              <button
                type="button"
                disabled={saving}
                onClick={() => removeSection(r.section!)}
                aria-label={`Clear ${r.title}`}
                className="size-8 grid place-items-center rounded-full text-grey-c500 hover:text-error-c500 transition-colors disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <ChevronRight className="size-4 text-grey-c500 shrink-0" />
          </div>
        ))}

        <p className="text-sm text-subtle pt-2">
          You can edit or delete any section anytime.
        </p>
      </div>

      <div className="shrink-0 px-6 pt-3 pb-8 bg-background">
        <button
          type="button"
          disabled={saving}
          onClick={removeProfile}
          className="w-full py-4 rounded-full border border-error-c500 text-error-c500 text-base font-semibold hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          Delete health profile
        </button>
      </div>
    </div>
  );
}
