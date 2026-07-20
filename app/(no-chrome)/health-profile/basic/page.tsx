"use client";

import { StepShell } from "@/components/health-profile/step-shell";
import { OptionGroup } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import {
  AGE_RANGES,
  BIOLOGICAL_SEX,
  PREGNANCY_STATUS,
} from "@/lib/health-profile/options";
import { isBasicComplete } from "@/lib/health-profile/types";

export default function BasicProfileStep() {
  const { draft, update } = useHealthProfile();
  const b = draft.basic;
  const setBasic = (patch: Partial<typeof b>) =>
    update({ basic: { ...b, ...patch } });

  return (
    <StepShell
      step="basic"
      title="Basic profile"
      sublabel="Required"
      canProceed={isBasicComplete(draft)}
    >
      <div className="space-y-8 pt-2">
        <OptionGroup
          label="Age range"
          hint="Why we ask: age helps us tailor recommendations that are appropriate for you."
          options={AGE_RANGES}
          value={b.ageRange}
          onChange={(k) => setBasic({ ageRange: k })}
        />
        <OptionGroup
          label="Biological sex"
          hint="Why we ask: relevant for dosing and ingredient safety."
          options={BIOLOGICAL_SEX}
          value={b.biologicalSex}
          onChange={(k) => setBasic({ biologicalSex: k })}
        />
        <OptionGroup
          label="Pregnant or breastfeeding?"
          hint="Why we ask: some ingredients are not recommended during pregnancy or breastfeeding."
          options={PREGNANCY_STATUS}
          value={b.pregnancyStatus}
          onChange={(k) => setBasic({ pregnancyStatus: k })}
        />
      </div>
    </StepShell>
  );
}
