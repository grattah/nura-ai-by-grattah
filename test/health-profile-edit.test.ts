import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Reported: "I updated goals, didn't press Save changes, and left. When I came
// back the abandoned goals were persisted — not the ones I DID save."
//
// Cause: `draft` is seeded once via useState and outlives the step, so an
// abandoned edit stayed in memory. Both finishEdit and saveProfile write the
// WHOLE draft, so the next save anywhere in the flow committed it.
//
// These pin the invariant structurally — the provider is a client context with
// router side effects, so asserting the wiring is the honest check here.
const provider = readFileSync(
  "components/health-profile/health-profile-provider.tsx",
  "utf8",
);
const shell = readFileSync("components/health-profile/step-shell.tsx", "utf8");

describe("abandoned health-profile edits are discarded", () => {
  it("tracks the last persisted state separately from the working draft", () => {
    expect(provider).toMatch(/savedRef\s*=\s*useRef<HealthProfileDraft>/);
  });

  it("resets the draft to that baseline when entering an edit", () => {
    const enterEdit = provider.slice(
      provider.indexOf("const enterEdit"),
      provider.indexOf("const cancelEdit"),
    );
    expect(enterEdit).toContain("setDraft(savedRef.current)");
  });

  it("offers an explicit cancel that restores the baseline", () => {
    const cancel = provider.slice(
      provider.indexOf("const cancelEdit"),
      provider.indexOf("// Save-changes from an edit"),
    );
    expect(cancel).toContain("setDraft(savedRef.current)");
  });

  it("advances the baseline only after a save actually succeeds", () => {
    // Both write paths must record it, or the next edit would reset to a stale
    // baseline and silently undo a genuine save.
    const assignments = provider.match(/savedRef\.current = draft;/g) ?? [];
    expect(assignments.length).toBe(2);
    // Never before the error branch returns.
    const finishEdit = provider.slice(
      provider.indexOf("const finishEdit"),
      provider.indexOf("const saveProfile"),
    );
    expect(finishEdit.indexOf("toast.error")).toBeLessThan(
      finishEdit.indexOf("savedRef.current = draft"),
    );
  });

  it("makes back discard the edit rather than leave it dangling", () => {
    expect(shell).toContain("onClick={cancelEdit}");
  });
});
