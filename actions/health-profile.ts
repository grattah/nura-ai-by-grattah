"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CONSENT_VERSION } from "@/lib/health-profile/options";
import {
  type HealthProfileDraft,
  type ProfileSection,
  hasSensitiveData,
  isBasicComplete,
} from "@/lib/health-profile/types";
import { needsConsent } from "@/lib/health-profile/consent";
import { MAX_GOALS } from "@/lib/health-profile/toggle";

interface HealthProfileRow {
  user_id: string;
  age_range: string | null;
  biological_sex: string | null;
  pregnancy_status: string | null;
  goals: string[];
  dietary_pattern: string | null;
  conditions: string[];
  conditions_other: string | null;
  allergies: string[];
  allergies_other: string | null;
  medications: { name: string; rxcui: string | null }[];
  consent_given_at: string | null;
  consent_version: string | null;
}

type ActionResult = { success: true } | { error: string };

function rowToDraft(row: HealthProfileRow): HealthProfileDraft {
  return {
    basic: {
      ageRange: row.age_range,
      biologicalSex: row.biological_sex,
      pregnancyStatus: row.pregnancy_status,
    },
    goals: row.goals ?? [],
    conditions: row.conditions ?? [],
    conditionsOther: row.conditions_other ?? "",
    allergies: row.allergies ?? [],
    allergiesOther: row.allergies_other ?? "",
    medications: row.medications ?? [],
    consent: !!row.consent_given_at,
    consentVersion: row.consent_version,
  };
}

export async function getHealthProfile(): Promise<HealthProfileDraft | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("health_profiles" as never)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? rowToDraft(data as unknown as HealthProfileRow) : null;
}

export async function saveHealthProfile(
  draft: HealthProfileDraft,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!isBasicComplete(draft))
    return { error: "Please complete your basic profile." };

  if (needsConsent(draft))
    return {
      error:
        "Please consent to storing your health data to continue, or clear the sensitive sections.",
    };

  const { data: priorRaw } = await supabase
    .from("health_profiles" as never)
    .select("consent_given_at, consent_version")
    .eq("user_id", user.id)
    .maybeSingle();
  const prior = priorRaw as unknown as {
    consent_given_at: string | null;
    consent_version: string | null;
  } | null;

  const giveConsent = hasSensitiveData(draft) && draft.consent;
  const consentGivenAt = giveConsent
    ? prior?.consent_given_at && prior.consent_version === CONSENT_VERSION
      ? prior.consent_given_at
      : new Date().toISOString()
    : (prior?.consent_given_at ?? null);
  const consentVersion = giveConsent
    ? CONSENT_VERSION
    : (prior?.consent_version ?? null);

  const row: HealthProfileRow = {
    user_id: user.id,
    age_range: draft.basic.ageRange,
    biological_sex: draft.basic.biologicalSex,
    pregnancy_status: draft.basic.pregnancyStatus,
    goals: draft.goals.slice(0, MAX_GOALS),
    dietary_pattern: null,
    conditions: draft.conditions,
    conditions_other: draft.conditionsOther.trim() || null,
    allergies: draft.allergies,
    allergies_other: draft.allergiesOther.trim() || null,
    medications: draft.medications,
    consent_given_at: consentGivenAt,
    consent_version: consentVersion,
  };

  const { error } = await supabase
    .from("health_profiles" as never)
    .upsert(row as never, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/health-profile");
  return { success: true };
}

export async function deleteHealthProfileSection(
  section: ProfileSection,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const patch: Partial<HealthProfileRow> =
    section === "goals"
      ? { goals: [] }
      : section === "conditions"
        ? { conditions: [], conditions_other: null }
        : section === "allergies"
          ? { allergies: [], allergies_other: null }
          : { medications: [] };

  const { error } = await supabase
    .from("health_profiles" as never)
    .update(patch as never)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/health-profile");
  return { success: true };
}

export async function deleteHealthProfile(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("health_profiles" as never)
    .delete()
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/health-profile");
  return { success: true };
}
