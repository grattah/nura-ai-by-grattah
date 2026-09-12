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
    test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(p),
  },
  { id: "hasNumber", label: "A number (1-9)", test: (p) => /[0-9]/.test(p) },
];

export type PasswordStrength = Record<RequirementId, boolean>;

export function checkPasswordStrength(password: string): PasswordStrength {
  return Object.fromEntries(
    PASSWORD_REQUIREMENTS.map((r) => [r.id, r.test(password)]),
  ) as PasswordStrength;
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
}

export function isStrengthValid(strength: PasswordStrength): boolean {
  return REQUIREMENT_IDS.every((id) => strength[id]);
}
