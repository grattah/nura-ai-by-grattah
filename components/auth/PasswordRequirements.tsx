"use client";

import { Check } from "lucide-react";
import {
  PASSWORD_REQUIREMENTS,
  isPasswordValid,
} from "@/lib/password-policy";

export { isPasswordValid };

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
        {PASSWORD_REQUIREMENTS.map((req) => {
          const isMet = req.test(password);
          return (
            <li key={req.label} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-colors ${
 isMet
 ? "bg-mint-green"
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
