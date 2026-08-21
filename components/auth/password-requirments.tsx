import { CheckCircle2, Circle } from "lucide-react";
import { FaCheckCircle } from "react-icons/fa";

export interface PasswordStrength {
  hasLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasSpecial: boolean;
  hasNumber: boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  return {
    hasLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

export function isPasswordValid(s: PasswordStrength): boolean {
  return s.hasLength && s.hasLower && s.hasUpper && s.hasSpecial && s.hasNumber;
}

const REQUIREMENTS = [
  { key: "hasLength" as const, label: "8 characters" },
  { key: "hasLower" as const, label: "A lowercase letter (a-z)" },
  { key: "hasUpper" as const, label: "A uppercase letter (A-Z)" },
  { key: "hasSpecial" as const, label: "A special character (e.g. !@#$)" },
  { key: "hasNumber" as const, label: "A number (1-9)" },
];

interface PasswordRequirementsProps {
  strength: PasswordStrength;
}

export function PasswordRequirements({ strength }: PasswordRequirementsProps) {
  return (
    <div className="bg-[#E8E6DC] rounded-xl p-3 space-y-3">
      <p className="text-sm font-medium text-base-text">
        Password needs at least:
      </p>
      {REQUIREMENTS.map(({ key, label }) => {
        const met = strength[key];
        return (
          <div key={key} className="flex items-center gap-2.5">
            {met ? (
              <FaCheckCircle
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--mint-green)" }}
                strokeWidth={2.5}
              />
            ) : (
              <Circle
                className="w-4 h-4 shrink-0 text-mint-green"
                strokeWidth={1.5}
              />
            )}
            <span className="text-sm text-base-text">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
