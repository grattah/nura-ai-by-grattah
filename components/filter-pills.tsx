"use client";

import { cn } from "@/lib/utils";

export interface FilterPill {
  slug: string;
  name: string;
}

interface FilterPillsProps {
  pills: FilterPill[];
  active: string;
  activeLabel?: string;
  onChange: (slug: string) => void;
}

export function FilterPills({
  pills,
  active,
  activeLabel,
  onChange,
}: FilterPillsProps) {
  const label = activeLabel ?? pills.find((p) => p.slug === active)?.name;

  return (
    <div className="space-y-2.5">
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {pills.map((pill) => {
          const isActive = pill.slug === active;
          return (
            <button
              key={pill.slug}
              onClick={() => onChange(pill.slug)}
              className={cn(
                "shrink-0 px-4 py-2 min-h-8 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95",
                isActive
                  ? "bg-foreground/70 text-background backdrop-blur-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={isActive}
            >
              {pill.name}
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
