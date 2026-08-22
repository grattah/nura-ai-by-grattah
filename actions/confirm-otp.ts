"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { cancelScheduledDeletion } from "@/actions/delete-account";
import { sanitizeNext } from "@/lib/safe-redirect";

/**
 * Consumes an emailed one-time token.
 *
 * Deliberately a POST-only server action rather than the GET route this used to
 * be: verifyOtp burns the token, and mail security scanners (Outlook SafeLinks,
 * Proofpoint, Mimecast) fetch every link in a message before the recipient sees
 * it. That fetch consumed the token, so the real click always landed on
 * /auth/error — QA saw reset links that were dead on first open. Scanners issue
 * GET and don't submit forms, so moving the burn behind a form submit keeps the
 * token intact until a human acts.
 */
export async function confirmOtp(formData: FormData): Promise<void> {
  const token_hash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const rawNext = String(formData.get("next") ?? "");

  if (!token_hash || !type) {
    redirect("/auth/error?error=Missing+token+hash+or+type");
  }

  const h = await headers();
  const origin =
    h.get("origin") ??
    (h.get("host") ? `https://${h.get("host")}` : "");
  const next = sanitizeNext(rawNext, origin);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error("[confirm] OTP verification failed:", error.message);
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  // A verified link is a sign-in: recover the account if a deletion was
  // pending. Recovery links included — regaining access is still access.
  await cancelScheduledDeletion();

  // Password recovery must always land on the reset-password form, regardless
  // of what `next` resolved to (Supabase falls back to the Site URL for `next`
  // if the requested redirect isn't allow-listed).
  redirect(type === "recovery" ? "/auth/update-password" : next);
}
