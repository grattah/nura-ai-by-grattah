// Single source of truth for "does this draft still need affirmative consent?".
//
// Consent is required only when the profile carries sensitive data (PRD §2.3–2.5)
// AND the user hasn't accepted the CURRENT consent version. Both the client (to
// decide whether to route the user to Review & Consent, and to enable Save) and
// the server action (as the authoritative guard) use this one predicate, so they
// can't disagree about whether a save is allowed.
//
// Lives in its own module rather than types.ts to avoid a types.ts ↔ options.ts
// import cycle (CONSENT_VERSION is defined in options.ts).

import { type HealthProfileDraft, hasSensitiveData } from "./types";
import { CONSENT_VERSION } from "./options";

/** True when the draft holds sensitive data without current-version consent. */
export function needsConsent(draft: HealthProfileDraft): boolean {
  if (!hasSensitiveData(draft)) return false;
  return !(draft.consent && draft.consentVersion === CONSENT_VERSION);
}
