"use client";

import { useState } from "react";
import { Search, Mic } from "lucide-react";

const COMMON_CONCERNS = [
  "Bloating",
  "Indigestion",
  "Heartburn",
  "Stress",
  "Fatigue",
  "Sleep",
];

export function SearchSection() {
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-3">
      <div
        style={{ border: query ? "1px solid var(--mint-green)" : "none" }}
        className="flex items-center gap-3 bg-card rounded-[12px] px-3 h-11.25 shadow-none"
      >
        <Search
          className="w-4 h-4 text-muted-foreground shrink-0"
          strokeWidth={1.75}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bloating, constipation, low energy, hor..."
          className="flex-1 bg-transparent text-base text-base-text outline-none placeholder:text-muted-2"
        />
        <Mic className="w-4 h-4 text-mint-green shrink-0" strokeWidth={1.75} />
      </div>

      <div>
        <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-3">
          Common Concerns
        </p>
        <div className="flex flex-wrap gap-2 mx-3">
          {COMMON_CONCERNS.map((concern) => (
            <button
              key={concern}
              onClick={() => setQuery(concern)}
              className="px-6 py-2.5 rounded-full bg-badge text-sm text-foreground border border-badge-border hover:opacity-75 transition-opacity active:scale-95"
            >
              {concern}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
