"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { CONSENT_VERSION } from "@/lib/health-profile/options";
import {
  type HealthProfileDraft,
  type ProfileSection,
  hasSensitiveData,
  isBasicComplete,
} from "@/lib/health-profile/types";

// Shape of a `health_profiles` row (table not yet in generated types).
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
  };
}

/** The current user's health profile, or null if none saved yet. */
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

/**
 * Upsert the current user's health profile. Requires an active subscription.
 * Basic profile (§2.1) is required; sensitive sections (§2.3–2.5) may only be
 * stored with affirmative consent (PRD §3).
 */
export async function saveHealthProfile(
  draft: HealthProfileDraft,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!(await hasActiveSubscription(supabase, user.id)))
    return { error: "A subscription is required to save a health profile." };

  if (!isBasicComplete(draft))
    return { error: "Please complete your basic profile." };

  const sensitive = hasSensitiveData(draft);
  if (sensitive && !draft.consent)
    return {
      error:
        "Please consent to storing your health data to continue, or clear the sensitive sections.",
    };

  const row: HealthProfileRow = {
    user_id: user.id,
    age_range: draft.basic.ageRange,
    biological_sex: draft.basic.biologicalSex,
    pregnancy_status: draft.basic.pregnancyStatus,
    goals: draft.goals,
    // Dietary-pattern step is disabled for now — always clear the column.
    dietary_pattern: null,
    conditions: draft.conditions,
    conditions_other: draft.conditionsOther.trim() || null,
    allergies: draft.allergies,
    allergies_other: draft.allergiesOther.trim() || null,
    medications: draft.medications,
    // Only record consent when there is sensitive data to consent to.
    consent_given_at: sensitive ? new Date().toISOString() : null,
    consent_version: sensitive ? CONSENT_VERSION : null,
  };

  const { error } = await supabase
    .from("health_profiles" as never)
    .upsert(row as never, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/health-profile");
  return { success: true };
}

/** Clear a single optional section (keeps the rest of the profile). */
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

/** Delete the entire health profile. */
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
