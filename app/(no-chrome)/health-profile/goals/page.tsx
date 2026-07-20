"use client";

import { StepShell } from "@/components/health-profile/step-shell";
import { GoalGrid } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { GOALS } from "@/lib/health-profile/options";
import { toggle } from "@/lib/health-profile/toggle";

export default function HealthGoalsStep() {
  const { draft, update } = useHealthProfile();
  return (
    <StepShell step="goals" title="Health goals" sublabel="Optional" optional>
      <p className="text-base font-medium leading-snug text-base-text mb-8 pt-3">
        Select all that apply. These map directly to your personalized nutrition
        score.
      </p>
      <GoalGrid
        goals={GOALS}
        selected={draft.goals}
        onToggle={(k) => update({ goals: toggle(draft.goals, k) })}
      />
    </StepShell>
  );
}
