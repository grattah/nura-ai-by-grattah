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
      sublabel="Select all that apply."
      optional
    >
      <div className="space-y-5">
        <Checklist
          options={CONDITIONS}
          selected={draft.conditions}
          onToggle={(k) => update({ conditions: toggle(draft.conditions, k) })}
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
