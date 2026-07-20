"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { StepShell } from "@/components/health-profile/step-shell";
import { MedicationChips } from "@/components/health-profile/fields";
import { useHealthProfile } from "@/components/health-profile/health-profile-provider";

export default function MedicationsStep() {
  const { draft, update } = useHealthProfile();
  const [entry, setEntry] = useState("");

  const add = () => {
    const name = entry.trim();
    if (!name) return;
    // Case-insensitive de-dupe.
    if (draft.medications.some((m) => m.toLowerCase() === name.toLowerCase())) {
      setEntry("");
      return;
    }
    update({ medications: [...draft.medications, name] });
    setEntry("");
  };

  const remove = (name: string) =>
    update({ medications: draft.medications.filter((m) => m !== name) });

  return (
    <StepShell
      step="medications"
      title="Medications & Supplements"
      sublabel="Optional"
      optional
    >
      <p className="text-base text-base-text leading-snug mb-4">
        This helps us flag recipes that may interact with something you&apos;re
        taking — for example, grapefruit can affect how certain medications are
        absorbed.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Add a medication or supplement"
          className="flex-1 bg-white rounded-xl px-4 h-13 border border-[#E3E1D8] text-base text-foreground outline-none focus:border-mint-green placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!entry.trim()}
          aria-label="Add"
          className="size-13 shrink-0 rounded-xl bg-mint-green grid place-items-center text-white hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Plus className="size-5" />
        </button>
      </form>

      {draft.medications.length > 0 && (
        <div className="mt-6 space-y-5">
          <p className="text-base font-semibold text-[#43474E]">
            Current medications / supplements
          </p>
          <MedicationChips medications={draft.medications} onRemove={remove} />
        </div>
      )}
    </StepShell>
  );
}
