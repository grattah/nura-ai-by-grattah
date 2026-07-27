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
          onToggle={(k) =>
            update({
              conditions: draft.conditions.includes(k)
                ? toggle(draft.conditions, k) // always allow deselect
                : draft.conditions.length < 3
                ? toggle(draft.conditions, k) // allow select only under the cap
                : draft.conditions, // at cap: ignore new selections
            })
          }
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
