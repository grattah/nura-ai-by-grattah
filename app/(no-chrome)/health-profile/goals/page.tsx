"use client";

import { StepShell } from "@/components/health-profile/step-shell";
import { GoalGrid } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { GOALS } from "@/lib/health-profile/options";
import { toggle } from "@/lib/health-profile/toggle";

export default function HealthGoalsStep() {
  const { draft, update } = useHealthProfile();
  return (
    <StepShell
      step="goals"
      title="What are your health goals?"
      sublabel="Select any 3 that apply."
      optional
    >
      <GoalGrid
        goals={GOALS}
        selected={draft.goals}
        onToggle={(k) => {
          const goals = draft.goals;
          if (goals.includes(k)) {
            update({ goals: goals.filter((g) => g !== k) });
          } else if (goals.length < 3) {
            update({ goals: [...goals, k] });
          } else {
            update({ goals: [...goals.slice(0, -1), k] });
          }
        }}
      />
    </StepShell>
  );
}
