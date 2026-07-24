import { redirect } from "next/navigation";

// The dietary-pattern step is disabled for now (see lib/health-profile/types.ts —
// `dietaryPattern`, the "dietary" section/step, and DIETARY_PATTERNS usage are
// commented out). This route redirects out so the URL never renders a broken
// step. To reinstate: restore the type bits, then swap the body below back in.
export default function DietaryPatternStep() {
  redirect("/health-profile");
}

/* Original step — reinstate alongside HealthProfileDraft.dietaryPattern:

"use client";

import { StepShell } from "@/components/health-profile/step-shell";
import { RadioList } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";
import { DIETARY_PATTERNS } from "@/lib/health-profile/options";

export default function DietaryPatternStep() {
  const { draft, update } = useHealthProfile();
  return (
	<></>
    // <StepShell
    //   step="dietary"
    //   title="Dietary pattern"
    //   sublabel="Optional"
    //   optional
    // >
    //   <p className="text-base text-base-text mb-4">
    //     Used for filtering and recipe suggestions, not for scoring or safety.
    //   </p>
    //   <RadioList
    //     options={DIETARY_PATTERNS}
    //     value={draft.dietaryPattern}
    //     onChange={(k) =>
    //       update({
    //         // Tapping the selected option again clears it (all optional).
    //         dietaryPattern: draft.dietaryPattern === k ? null : k,
    //       })
    //     }
    //   />
    // </StepShell>
  );
}
*/
