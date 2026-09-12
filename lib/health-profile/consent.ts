// import cycle (CONSENT_VERSION is defined in options.ts).

import { type HealthProfileDraft, hasSensitiveData } from "./types";
import { CONSENT_VERSION } from "./options";

export function needsConsent(draft: HealthProfileDraft): boolean {
  if (!hasSensitiveData(draft)) return false;
  return !(draft.consent && draft.consentVersion === CONSENT_VERSION);
}
