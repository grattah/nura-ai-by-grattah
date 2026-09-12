"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, CirclePlus, Plus } from "lucide-react";
import { StepShell } from "@/components/health-profile/step-shell";
import { MedicationChips } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";

interface MedResult {
  name: string;
  rxcui: string;
}

function highlight(name: string, query: string) {
  const q = query.trim();
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return name;
  return (
    <>
      <span className="font-semibold">{name.slice(0, i + q.length)}</span>
      {name.slice(i + q.length)}
    </>
  );
}

export default function MedicationsStep() {
  const { draft, update } = useHealthProfile();
  const meds = draft.medications;

  const [mode, setMode] = useState<"list" | "search">(
    meds.length ? "list" : "search",
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldFocus = useRef(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/medications/search?term=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => {
          if (active) setResults(d.results ?? []);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (mode === "search" && shouldFocus.current) {
      inputRef.current?.focus();
      shouldFocus.current = false;
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "list" && meds.length === 0) setMode("search");
  }, [mode, meds.length]);

  const add = (med: MedResult) => {
    if (!meds.some((m) => m.name.toLowerCase() === med.name.toLowerCase())) {
      update({
        medications: [...meds, { name: med.name, rxcui: med.rxcui }],
      });
    }
    inputRef.current?.focus();
  };

  const remove = (name: string) =>
    update({ medications: meds.filter((m) => m.name !== name) });

  const openSearch = () => {
    shouldFocus.current = true;
    setMode("search");
  };

  const addedLower = new Set(meds.map((m) => m.name.toLowerCase()));
  const visibleResults = results.filter(
    (r) => !addedLower.has(r.name.toLowerCase()),
  );
  const showResults = query.trim().length >= 2;

  return (
    <StepShell
      step="medications"
      title="Medications & Supplements"
      sublabel="Optional"
      optional
    >
      <p className="text-base text-base-text leading-snug mb-5">
        This helps us flag recipes that may interact with something you&apos;re
        taking — for example, grapefruit can affect how certain medications are
        absorbed.
      </p>

      {mode === "search" ? (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl px-4 h-13 border border-[#9CA5A3] focus-within:border-mint-green">
            <Search className="size-5 text-subtle shrink-0" strokeWidth={1.75} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => {
                if (meds.length > 0) setMode("list");
              }}
              placeholder="Search medications or supplements"
              className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="text-subtle hover:text-base-text transition-colors shrink-0"
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          {showResults && (
            <div className="mt-5">
              <p className="text-base font-semibold text-base-text">Results</p>
              <p className="text-sm text-subtle mb-2">
                {loading
                  ? "Searching…"
                  : `${visibleResults.length} found`}
              </p>
              {!loading &&
                visibleResults.map((r) => (
                  <button
                    key={r.rxcui + r.name}
                    type="button"
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => add(r)}
                    className="w-full flex items-center justify-between gap-3 py-3.5 border-b border-[#E3E1D8] text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="text-base text-base-text">
                      {highlight(r.name, query)}
                    </span>
                    <CirclePlus
                      className="size-6 text-subtle shrink-0"
                      strokeWidth={1.75}
                    />
                  </button>
                ))}
              {!loading && visibleResults.length === 0 && (
                <p className="text-sm text-subtle py-3">No matches found.</p>
              )}
            </div>
          )}

          {meds.length > 0 && (
            <div className="mt-8 space-y-4">
              <p className="text-base font-semibold text-[#43474E]">
                Current medications / supplements
              </p>
              <MedicationChips
            medications={meds.map((m) => m.name)}
            onRemove={remove}
          />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-5">
          <p className="text-base font-semibold text-[#43474E]">
            Current medications / supplements
          </p>
          <MedicationChips
            medications={meds.map((m) => m.name)}
            onRemove={remove}
          />
          <button
            type="button"
            onClick={openSearch}
            className="flex items-center gap-2 text-mint-green font-semibold hover:opacity-75 transition-opacity"
          >
            <Plus className="size-5" strokeWidth={2} />
            Add another
          </button>
        </div>
      )}
    </StepShell>
  );
}
