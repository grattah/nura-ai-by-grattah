"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail } from "@/lib/email/templates";

/**
 * Best-effort confirmation email sent right after a successful password
 * reset, while the recovery session is still active.
 */
export async function sendPasswordChangedEmail(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  try {
    const { subject, html } = passwordChangedEmail();
    await sendEmail({ to: user.email, subject, html });
  } catch (e) {
    console.error("[password-changed] send failed", e);
  }
}
