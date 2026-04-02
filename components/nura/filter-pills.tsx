"use client";

import { cn } from "@/lib/utils";

export interface FilterPill {
  value: string;
  label: string;
}

interface FilterPillsProps {
  pills: FilterPill[];
  active: string;
  activeLabel?: string;
  onChange: (value: string) => void;
}

export function FilterPills({
  pills,
  active,
  activeLabel,
  onChange,
}: FilterPillsProps) {
  const label = activeLabel ?? pills.find((p) => p.value === active)?.label;

  return (
    <div className="space-y-2.5">
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {pills.map((pill) => {
          const isActive = pill.value === active;
          return (
            <button
              key={pill.value}
              onClick={() => onChange(pill.value)}
              className={cn(
                "shrink-0 px-5 min-h-11 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={isActive}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {label && (
        <p className="text-sm text-muted-foreground px-1">
          Showing:{" "}
          <span className="font-semibold text-foreground">{label}</span>
        </p>
      )}
    </div>
  );
}
