"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import {
  saveGuestDraft,
  consumeGuestDraft,
} from "@/lib/health-profile/guest-draft";
import { useAccess } from "@/hooks/use-access";
import { SignInModal } from "@/components/auth/SignInModal";

type Mode = "onboarding" | "edit";

interface HealthProfileContextValue {
  draft: HealthProfileDraft;
  exists: boolean;
  mode: Mode;
  saving: boolean;
  justCompleted: boolean;
  dismissJustCompleted: () => void;
  update: (
    patch:
      | Partial<HealthProfileDraft>
      | ((d: HealthProfileDraft) => Partial<HealthProfileDraft>),
  ) => void;
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
  const { isAuthenticated, isLoading } = useAccess();
  const [draft, setDraft] = useState<HealthProfileDraft>(
    initialProfile ?? EMPTY_DRAFT,
  );
  const [exists, setExists] = useState(initialProfile !== null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const savedRef = useRef<HealthProfileDraft>(initialProfile ?? EMPTY_DRAFT);
  const [mode, setMode] = useState<Mode>("onboarding");
  const [returnTo, setReturnTo] = useState(`${BASE}/review`);
  const [saving, startSaving] = useTransition();
  const [justCompleted, setJustCompleted] = useState(false);

  const dismissJustCompleted = useCallback(() => setJustCompleted(false), []);

  const update = useCallback(
    (
      patch:
        | Partial<HealthProfileDraft>
        | ((d: HealthProfileDraft) => Partial<HealthProfileDraft>),
    ) => {
      setDraft((d) => ({
        ...d,
        ...(typeof patch === "function" ? patch(d) : patch),
      }));
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
      setDraft(savedRef.current);
      setMode("edit");
      setReturnTo(from);
      router.push(`${BASE}/${step}`);
    },
    [router],
  );

  const cancelEdit = useCallback(() => {
    setDraft(savedRef.current);
    setMode("onboarding");
    router.push(returnTo);
  }, [returnTo, router]);

  const finishEdit = useCallback(() => {
    const go = () => {
      setMode("onboarding");
      router.push(returnTo);
    };
    if (!exists) return go();
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
    if (!isLoading && !isAuthenticated) {
      saveGuestDraft(draft);
      setShowAuthGate(true);
      return;
    }
    if (needsConsent(draft)) {
      router.push(`${BASE}/review`);
      return;
    }
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
  }, [draft, exists, router, isAuthenticated, isLoading]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || initialProfile !== null) return;
    const pending = consumeGuestDraft();
    if (pending) setDraft(pending);
  }, [isLoading, isAuthenticated, initialProfile]);

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
      {showAuthGate && <SignInModal onClose={() => setShowAuthGate(false)} />}
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
