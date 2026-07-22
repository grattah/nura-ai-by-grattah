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
    startSaving(async () => {
      const res = await saveHealthProfile(draft);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setExists(true);
      toast.success("Health profile saved.");
      router.refresh();
      router.push(BASE);
    });
  }, [draft, router]);

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
