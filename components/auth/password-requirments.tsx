import { Circle } from "lucide-react";
import {
  PASSWORD_REQUIREMENTS,
  type PasswordStrength,
} from "@/lib/password-policy";
import { FaCheckCircle } from "react-icons/fa";
import localFont from "next/font/local";

const satoshi = localFont({
  src: "../../fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
});

// The rules live in lib/password-policy.ts so this component and the server
// action behind /account cannot drift apart. Only the presentation is local.
export type { PasswordStrength } from "@/lib/password-policy";
export {
  checkPasswordStrength,
  isStrengthValid as isPasswordValid,
} from "@/lib/password-policy";

interface PasswordRequirementsProps {
  strength: PasswordStrength;
}

export function PasswordRequirements({ strength }: PasswordRequirementsProps) {
  return (
    <div className="bg-[#E8E6DC] rounded-xl p-3 space-y-3">
      <p className={`text-sm font-medium text-base-text ${satoshi.className}`}>
        Password needs at least:
      </p>
      {PASSWORD_REQUIREMENTS.map(({ id, label }) => {
        const met = strength[id];
        return (
          <div key={id} className="flex items-center gap-2.5">
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
            <span className={`text-sm text-base-text ${satoshi.className}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
