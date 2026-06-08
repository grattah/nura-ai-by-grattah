"use client";

import { Check } from "lucide-react";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: "8 characters",
    test: (p) => p.length >= 8,
  },
  {
    label: "A lowercase letter (a-z)",
    test: (p) => /[a-z]/.test(p),
  },
  {
    label: "An uppercase letter (A-Z)",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    label: "A special character (e.g. !@#$)",
    test: (p) => /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(p),
  },
  {
    label: "A number (1-9)",
    test: (p) => /[0-9]/.test(p),
  },
];

interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <div className="rounded-xl bg-[#F5F3EC] p-4 flex flex-col gap-2">
      <p className="text-sm font-medium text-[#1A1A1A]">
        Password needs at least:
      </p>
      <ul className="flex flex-col gap-2">
        {requirements.map((req) => {
          const isMet = req.test(password);
          return (
            <li key={req.label} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-colors ${
                  isMet
                    ? "bg-[#227B6F]"
                    : "border-2 border-[#9CA5A3] bg-transparent"
                }`}
                aria-hidden="true"
              >
                {isMet && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </span>
              <span
                className={`text-sm transition-colors ${
                  isMet ? "text-[#1A1A1A]" : "text-[#57605E]"
                }`}
              >
                {req.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Export a helper to check if all requirements are met (useful for the parent form)
export function isPasswordValid(password: string): boolean {
  return requirements.every((req) => req.test(password));
}
