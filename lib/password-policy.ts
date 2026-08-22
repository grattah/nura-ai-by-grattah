/**
 * The app's password policy, in one place.
 *
 * Two independent implementations of these rules existed after the merge with
 * feature/updated-ui — one keyed on the raw password, one on a PasswordStrength
 * object — and their special-character sets already disagreed (`~` and a
 * backtick were accepted by one and rejected by the other). This module is now
 * the single definition; both UI components and the server action derive from
 * it, so the client can no longer accept a password the server rejects, or the
 * reverse.
 *
 * Kept free of "use client" so server actions can enforce it too.
 */
export const REQUIREMENT_IDS = [
  "hasLength",
  "hasLower",
  "hasUpper",
  "hasSpecial",
  "hasNumber",
] as const;

export type RequirementId = (typeof REQUIREMENT_IDS)[number];

export interface PasswordRequirement {
  id: RequirementId;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: "hasLength", label: "8 characters", test: (p) => p.length >= 8 },
  { id: "hasLower", label: "A lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { id: "hasUpper", label: "An uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  {
    id: "hasSpecial",
    label: "A special character (e.g. !@#$)",
    // The union of both pre-merge character sets. Widening the client rule to
    // match the server is the safe direction: the alternative would reject a
    // password the server would have accepted.
    test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(p),
  },
  { id: "hasNumber", label: "A number (1-9)", test: (p) => /[0-9]/.test(p) },
];

/** Per-requirement pass/fail, for UIs that render a live checklist. */
export type PasswordStrength = Record<RequirementId, boolean>;

export function checkPasswordStrength(password: string): PasswordStrength {
  return Object.fromEntries(
    PASSWORD_REQUIREMENTS.map((r) => [r.id, r.test(password)]),
  ) as PasswordStrength;
}

/** Whether every requirement passes. Accepts the raw password. */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
}

/** The same check against an already-computed strength object. */
export function isStrengthValid(strength: PasswordStrength): boolean {
  return REQUIREMENT_IDS.every((id) => strength[id]);
}
