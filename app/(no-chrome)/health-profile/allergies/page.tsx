"use client";

import { Shield } from "lucide-react";
import { StepShell } from "@/components/health-profile/step-shell";
import { Checklist, OtherInput } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { ALLERGENS } from "@/lib/health-profile/options";
import { toggle } from "@/lib/health-profile/toggle";

export default function AllergiesStep() {
  const { draft, update } = useHealthProfile();
  return (
    <StepShell
      step="allergies"
      title="Allergies & Intolerances"
      sublabel="Optional"
    >
      <p className="text-base text-base-text mb-5">
        This helps us keep you safe. You can edit this anytime.
      </p>
      <div className="space-y-5">
        <Checklist
          options={ALLERGENS}
          selected={draft.allergies}
          onToggle={(k) => update({ allergies: toggle(draft.allergies, k) })}
        />
        <OtherInput
          value={draft.allergiesOther}
          onChange={(v) => update({ allergiesOther: v })}
        />
      </div>

      <div className="mt-6 flex items-start gap-4 rounded-xl-5 bg-[#E6ECEA] p-4">
        <span className="size-9 rounded-full bg-mint-green grid place-items-center shrink-0">
          <Shield className="size-4 text-white" />
        </span>
        <div>
          <p className="text-sm font-semibold text-base-text">
            Safety critical
          </p>
          <p className="text-sm text-subtle leading-4.5">
            Allergies &amp; intolerances are used for safety filtering, not
            scoring.
          </p>
        </div>
      </div>
    </StepShell>
  );
}
