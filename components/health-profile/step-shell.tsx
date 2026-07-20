"use client";

import BackButton from "@/components/back-button";
import { type Step } from "@/lib/health-profile/types";
import { useHealthProfile } from "./health-profile-provider";

/**
 * Common frame for every questionnaire step: header (back + title + sub-label)
 * and a sticky footer whose buttons depend on the flow mode:
 *   • onboarding → Skip (optional steps) + Continue
 *   • edit       → single Save changes
 */
export function StepShell({
  step,
  title,
  sublabel,
  optional = false,
  canProceed = true,
  children,
}: {
  step: Step;
  title: string;
  sublabel?: string;
  optional?: boolean;
  canProceed?: boolean;
  children: React.ReactNode;
}) {
  const { mode, next, finishEdit, saving } = useHealthProfile();
  const isEdit = mode === "edit";

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-4 relative shrink-0">
        <BackButton className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity" />
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-xl font-semibold text-base-text">{title}</h1>
          {sublabel && (
            <p className="text-sm text-subtle font-medium mt-1.75">
              {sublabel}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">{children}</div>

      {/* Footer */}
      <div className="shrink-0 px-6 pt-3 pb-8 bg-background flex gap-3">
        {isEdit ? (
          <button
            type="button"
            disabled={!canProceed || saving}
            onClick={finishEdit}
            className="flex-1 py-4 rounded-full bg-mint-green text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            Save changes
          </button>
        ) : (
          <>
            {optional && (
              <button
                type="button"
                disabled={saving}
                onClick={() => next(step)}
                className="px-8 py-4 rounded-full bg-[#E3E1D8] text-base-text text-base font-semibold hover:opacity-80 transition-opacity"
              >
                Skip
              </button>
            )}
            <button
              type="button"
              disabled={!canProceed || saving}
              onClick={() => next(step)}
              className="flex-1 py-4 rounded-full bg-mint-green text-white text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
