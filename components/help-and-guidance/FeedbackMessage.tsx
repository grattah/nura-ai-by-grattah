"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

const MAX = 100;

export function FeedbackMessage({
  value: controlledValue,
  onChange,
}: {
  value?: string;
  onChange?: (v: string) => void;
}) {
  // Works controlled (parent owns it) or uncontrolled (self-owned).
  const [internal, setInternal] = useState("");
  const value = controlledValue ?? internal;

  const setValue = (next: string) => {
    // Enforce the cap here too, not just via maxLength, so pasted text
    // that exceeds the limit gets clipped rather than rejected wholesale.
    const clipped = next.slice(0, MAX);
    if (controlledValue === undefined) setInternal(clipped);
    onChange?.(clipped);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="rounded-lg bg-white border border-[#E6ECEA] py-3.5 px-4">
        <div className="flex gap-3">
          {!value && (
            <Mail size={16} color="#57605E" className="shrink-0 mt-0.5" />
          )}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={MAX}
            rows={5}
            placeholder="Enter message here"
            className="flex-1 text-sm resize-none bg-white text-[#1B1D1D] outline-none placeholder:text-[#9CA5A3]"
          />
        </div>
      </div>
      <p
        className={`text-sm ${
          value.length >= MAX ? "text-[#227B6F] font-medium" : "text-[#1B1D1D]"
        }`}
        aria-live="polite"
      >
        {value.length}/{MAX}
      </p>
    </div>
  );
}
