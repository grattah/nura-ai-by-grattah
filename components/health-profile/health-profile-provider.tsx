"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
  update: (patch: Partial<HealthProfileDraft>) => void;
  // Navigation
  startOnboarding: () => void;
  next: (current: Step) => void;
  enterEdit: (step: Step, returnTo: string) => void;
  finishEdit: () => void;
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
  const [mode, setMode] = useState<Mode>("onboarding");
  const [returnTo, setReturnTo] = useState(`${BASE}/review`);
  const [saving, startSaving] = useTransition();
  const [justCompleted, setJustCompleted] = useState(false);

  const dismissJustCompleted = useCallback(() => setJustCompleted(false), []);

  const update = useCallback((patch: Partial<HealthProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

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
      setMode("edit");
      setReturnTo(from);
      router.push(`${BASE}/${step}`);
    },
    [router],
  );

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
