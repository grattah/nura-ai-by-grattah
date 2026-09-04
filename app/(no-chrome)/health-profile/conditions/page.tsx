"use client";

import { StepShell } from "@/components/health-profile/step-shell";
import { Checklist, OtherInput } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { CONDITIONS } from "@/lib/health-profile/options";
import { toggleCapped, MAX_CONDITIONS } from "@/lib/health-profile/toggle";

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
          // Capped at three, as before the AUG 21 set. Uses the same
          // toggleCapped helper as goals so a tap past the cap replaces the
          // OLDEST selection instead of being silently ignored, and reads from
          // the latest draft rather than the render closure.
          onToggle={(k) =>
            update((d) => ({
              conditions: toggleCapped(d.conditions, k, MAX_CONDITIONS),
            }))
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
