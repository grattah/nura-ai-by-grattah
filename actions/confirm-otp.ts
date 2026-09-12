"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { cancelScheduledDeletion } from "@/actions/delete-account";
import { sanitizeNext } from "@/lib/safe-redirect";

/** Verifies an emailed token on POST only, so link scanners can't consume it. */
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

  await cancelScheduledDeletion();

  redirect(type === "recovery" ? "/auth/update-password" : next);
}
