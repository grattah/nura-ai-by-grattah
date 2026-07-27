"use client";

import { StepShell } from "@/components/health-profile/step-shell";
import { Checklist, OtherInput } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { CONDITIONS } from "@/lib/health-profile/options";
import { toggle } from "@/lib/health-profile/toggle";

export default function ExistingConditionsStep() {
  const { draft, update } = useHealthProfile();
  return (
    <StepShell
      step="conditions"
      title="Existing conditions"
      sublabel="Select any three that apply."
      optional
    >
      <div className="space-y-5">
        <Checklist
          options={CONDITIONS}
          selected={draft.conditions}
          onToggle={(k) => {
            const conditions = draft.conditions;
            if (conditions.includes(k)) {
              update({ conditions: conditions.filter((g) => g !== k) });
            } else if (conditions.length < 3) {
              update({ conditions: [...conditions, k] });
            } else {
              update({ conditions: [...conditions.slice(0, -1), k] });
            }
          }}
        />
        {/* <OtherInput
          value={draft.conditionsOther}
          onChange={(v) => update({ conditionsOther: v })}
        />
        <p className="text-xs text-subtle">
          Leave anything unchecked that you&apos;d prefer not to share.
        </p> */}
      </div>
    </StepShell>
  );
}
