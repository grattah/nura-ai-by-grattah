"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  type HealthProfileDraft,
  type ProfileSection,
  type Step,
  STEP_ORDER,
  EMPTY_DRAFT,
} from "@/lib/health-profile/types";
import { needsConsent } from "@/lib/health-profile/consent";
import {
  saveHealthProfile,
  deleteHealthProfileSection,
  deleteHealthProfile,
} from "@/actions/health-profile";

type Mode = "onboarding" | "edit";

interface HealthProfileContextValue {
  draft: HealthProfileDraft;
  /** True when a profile already exists in the DB (drives edit-persistence). */
  exists: boolean;
  mode: Mode;
  saving: boolean;
  /** True right after a first-time profile save; drives the success modal on the base page. */
  justCompleted: boolean;
  dismissJustCompleted: () => void;
  update: (
    patch:
      | Partial<HealthProfileDraft>
      | ((d: HealthProfileDraft) => Partial<HealthProfileDraft>),
  ) => void;
  // Navigation
  startOnboarding: () => void;
  next: (current: Step) => void;
  enterEdit: (step: Step, returnTo: string) => void;
  finishEdit: () => void;
  cancelEdit: () => void;
  saveProfile: () => void;
  removeSection: (section: ProfileSection) => void;
  removeProfile: () => void;
}

const CLEARED: Record<ProfileSection, Partial<HealthProfileDraft>> = {
  goals: { goals: [] },
  conditions: { conditions: [], conditionsOther: "" },
  allergies: { allergies: [], allergiesOther: "" },
  medications: { medications: [] },
  // dietary: { dietaryPattern: null },
};

const HealthProfileContext = createContext<HealthProfileContextValue | null>(
  null,
);

const BASE = "/health-profile";

export function HealthProfileProvider({
  initialProfile,
  children,
}: {
  initialProfile: HealthProfileDraft | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<HealthProfileDraft>(
    initialProfile ?? EMPTY_DRAFT,
  );
  const [exists, setExists] = useState(initialProfile !== null);
  // The last state we know is in the DB. `draft` is a working copy that may
  // hold uncommitted edits; this is what those edits are discarded back to.
  const savedRef = useRef<HealthProfileDraft>(initialProfile ?? EMPTY_DRAFT);
  const [mode, setMode] = useState<Mode>("onboarding");
  const [returnTo, setReturnTo] = useState(`${BASE}/review`);
  const [saving, startSaving] = useTransition();
  const [justCompleted, setJustCompleted] = useState(false);

  const dismissJustCompleted = useCallback(() => setJustCompleted(false), []);

  // Accepts a function so a handler can derive its patch from the LATEST draft.
  // Reading `draft` from the render closure meant two taps landing in the same
  // render both computed from the same stale array, and the second overwrote
  // the first — which looked like a 3-goal cap only ever reaching 2.
  const update = useCallback(
    (
      patch:
        | Partial<HealthProfileDraft>
        | ((d: HealthProfileDraft) => Partial<HealthProfileDraft>),
    ) => {
      setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) }));
    },
    [],
  );

  const startOnboarding = useCallback(() => {
    setMode("onboarding");
    router.push(`${BASE}/${STEP_ORDER[0]}`);
  }, [router]);

  const next = useCallback(
    (current: Step) => {
      const i = STEP_ORDER.indexOf(current);
      const step = STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
      router.push(`${BASE}/${step}`);
    },
    [router],
  );

  const enterEdit = useCallback(
    (step: Step, from: string) => {
      // Start every edit from what is actually persisted.
      //
      // The draft outlives a step: leaving without pressing "Save changes" used
      // to keep the abandoned change in memory, and because finishEdit and
      // saveProfile write the WHOLE draft, the next save anywhere in the flow
      // silently committed it. Users saw an edit they had walked away from win
      // over one they had explicitly saved.
      setDraft(savedRef.current);
      setMode("edit");
      setReturnTo(from);
      router.push(`${BASE}/${step}`);
    },
    [router],
  );

  /** Leave an edit without saving, discarding the in-progress change. */
  const cancelEdit = useCallback(() => {
    setDraft(savedRef.current);
    setMode("onboarding");
    router.push(returnTo);
  }, [returnTo, router]);

  // Save-changes from an edit. If the profile already exists, persist the whole
  // draft immediately; otherwise (editing mid-onboarding) just return.
  const finishEdit = useCallback(() => {
    const go = () => {
      setMode("onboarding");
      router.push(returnTo);
    };
    if (!exists) return go();
    // The edit just introduced sensitive data (or consent is for an outdated
    // version) and the consent checkbox lives only on Review — send them there
    // rather than failing the save with a toast they can't act on. Mode/returnTo
    // are kept so consenting lands them back where they came from.
    if (needsConsent(draft)) {
      router.push(`${BASE}/review`);
      return;
    }
    startSaving(async () => {
      const res = await saveHealthProfile(draft);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      savedRef.current = draft;
      router.refresh();
      go();
    });
  }, [draft, exists, returnTo, router]);

  const saveProfile = useCallback(() => {
    // Symmetry with finishEdit: Review's Save button is already disabled in this
    // state, so this only catches a stale/forced call.
    if (needsConsent(draft)) {
      router.push(`${BASE}/review`);
      return;
    }
    // Captured before the save resolves: only a first-time save (onboarding,
    // not editing an already-existing profile) should trigger the success modal.
    const firstTime = !exists;
    startSaving(async () => {
      const res = await saveHealthProfile(draft);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      savedRef.current = draft;
      setExists(true);
      if (firstTime) setJustCompleted(true);
      toast.success("Health profile saved.");
      router.refresh();
      router.push(BASE);
    });
  }, [draft, exists, router]);

  const removeSection = useCallback(
    (section: ProfileSection) => {
      startSaving(async () => {
        const res = await deleteHealthProfileSection(section);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
        setDraft((d) => ({ ...d, ...CLEARED[section] }));
        router.refresh();
      });
    },
    [router],
  );

  const removeProfile = useCallback(() => {
    startSaving(async () => {
      const res = await deleteHealthProfile();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setDraft(EMPTY_DRAFT);
      setExists(false);
      toast.success("Health profile deleted.");
      router.refresh();
    });
  }, [router]);

  const value = useMemo<HealthProfileContextValue>(
    () => ({
      draft,
      exists,
      mode,
      saving,
      justCompleted,
      dismissJustCompleted,
      update,
      startOnboarding,
      next,
      enterEdit,
      finishEdit,
      cancelEdit,
      saveProfile,
      removeSection,
      removeProfile,
    }),
    [
      draft,
      exists,
      mode,
      saving,
      justCompleted,
      dismissJustCompleted,
      update,
      startOnboarding,
      next,
      enterEdit,
      finishEdit,
      cancelEdit,
      saveProfile,
      removeSection,
      removeProfile,
    ],
  );

  return (
    <HealthProfileContext.Provider value={value}>
      {children}
    </HealthProfileContext.Provider>
  );
}

export function useHealthProfile() {
  const ctx = useContext(HealthProfileContext);
  if (!ctx)
    throw new Error(
      "useHealthProfile must be used within a HealthProfileProvider",
    );
  return ctx;
}
