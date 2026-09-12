import type { HealthProfileDraft } from "./types";

// Bridges a guest's in-progress wizard answers across the sign-up detour:
// saved right before the sign-in modal appears, consumed once the user is
// back on Review authenticated. Not a general persistence framework — this
// is the one spot in the app that needs it.

const KEY = "nura-health-profile-guest-draft";
const TTL_MS = 30 * 60 * 1000; // long enough to complete sign-up, short enough to not resurrect a stale draft

interface StoredDraft {
  draft: HealthProfileDraft;
  ts: number;
}

export function saveGuestDraft(draft: HealthProfileDraft): void {
  try {
    const stored: StoredDraft = { draft, ts: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Private browsing / storage disabled — the guest just re-hits the
    // sign-in wall with an empty draft after signing up, no worse than today.
  }
}

/** Reads and removes the pending draft, if any and not expired. */
export function consumeGuestDraft(): HealthProfileDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredDraft;
    if (Date.now() - stored.ts > TTL_MS) return null;
    return stored.draft;
  } catch {
    return null;
  } finally {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
