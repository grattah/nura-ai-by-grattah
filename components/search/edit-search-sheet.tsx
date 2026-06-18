"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, X, SendHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const COMMON_CONCERNS = [
  "Bloating",
  "Indigestion",
  "Heartburn",
  "Stress",
  "Fatigue",
  "Sleep",
];

export const RECENT_SEARCHES_KEY = "nura_recent_searches";

export function saveRecentSearch(query: string) {
  try {
    const existing: string[] = JSON.parse(
      localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
    );
    const updated = [query, ...existing.filter((q) => q !== query)].slice(0, 3);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — fail silently
  }
}

interface EditSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentQuery: string;
}

export function EditSearchSheet({
  open,
  onOpenChange,
  currentQuery,
}: EditSearchSheetProps) {
  const router = useRouter();
  const [query, setQuery] = useState(currentQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    if (!open) return;
    try {
      const stored: string[] = JSON.parse(
        localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
      );
      setRecentSearches(stored);
    } catch {
      setRecentSearches([]);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    onOpenChange(false);
    router.push(`/personalized-search?q=${encodeURIComponent(query.trim())}`);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-full rounded-t-0 border-0 p-0 flex flex-col bg-background [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Edit search</SheetTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <h2 className="text-xl max-xs:text-lg font-semibold text-foreground">
            Edit search
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full bg-card flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
          {/* Search input */}
          <div className="flex items-center gap-3 bg-card rounded-[12px] max-xs:rounded-sm px-3 h-12 max-xs:h-10 border border-mint-green">
            <Search
              className="w-4 h-4 text-muted-foreground shrink-0"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
              className="flex-1 bg-transparent text-base max-xs:text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {query.trim() && (
              <button
                onClick={handleSubmit}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--mint-green)" }}
                aria-label="Search"
              >
                <SendHorizontal className="size-4 text-white" />
              </button>
            )}
          </div>

          {/* Common concerns */}
          <div>
            <p className="text-xs font-medium text-subtle uppercase tracking-wider mb-3">
              Common Concerns
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_CONCERNS.map((concern) => (
                <button
                  key={concern}
                  onClick={() => setQuery(concern)}
                  className="px-5 max-xs:px-3 py-2.5 max-xs:py-1.5 rounded-full bg-badge text-sm max-xs:text-xs text-foreground border border-badge-border hover:opacity-75 transition-opacity active:scale-95"
                >
                  {concern}
                </button>
              ))}
            </div>
          </div>

          {/* Recently searched */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-muted-foreground">
                  Recently searched
                </p>
                <button
                  onClick={clearRecentSearches}
                  className="text-sm font-semibold hover:opacity-75 transition-opacity underline underline-offset-2"
                  style={{ color: "var(--mint-green)" }}
                >
                  Clear
                </button>
              </div>
              <div>
                {recentSearches.map((search, i) => (
                  <div key={search}>
                    {i > 0 && <Separator className="bg-border" />}
                    <button
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 py-3.5 text-left hover:opacity-75 transition-opacity"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-base max-xs:text-sm text-foreground">
                        {search}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
