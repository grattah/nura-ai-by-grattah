"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";

/**
 * Send the welcome email once per account. Idempotent via `profiles.welcomed_at`
 * so it's safe to call from multiple entry points (OTP signup, OAuth callback).
 * Best-effort: if the send fails we don't set the flag, so a later entry retries.
 */
export async function ensureWelcomeEmail(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const admin = createServiceRoleClient();
  const { data: profileRaw } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRaw as { welcomed_at?: string | null } | null;
  if (profile?.welcomed_at) return;

  try {
    const name = (user.user_metadata?.full_name as string | undefined) ?? null;
    const { subject, html } = welcomeEmail({ name });
    await sendEmail({ to: user.email, subject, html });
  } catch (e) {
    console.error("[welcome] send failed", e);
    return;
  }

  await admin
    .from("profiles")
    .update({ welcomed_at: new Date().toISOString() } as never)
    .eq("id", user.id);
}
