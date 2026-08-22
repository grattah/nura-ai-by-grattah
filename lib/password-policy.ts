/**
 * The app's password policy, in one place.
 *
 * Previously this lived only inside the PasswordRequirements client component,
 * so it was advisory: the reset form checked it, signup checked only length,
 * and the server action behind /account checked only length. A password that
 * signup accepted could therefore be one the reset form would refuse.
 *
 * Kept free of "use client" so server actions can enforce it too.
 */
export interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "8 characters", test: (p) => p.length >= 8 },
  { label: "A lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "An uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  {
    label: "A special character (e.g. !@#$)",
    test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(p),
  },
  { label: "A number (1-9)", test: (p) => /[0-9]/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
}
