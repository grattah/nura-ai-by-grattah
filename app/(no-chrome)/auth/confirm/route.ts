import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelScheduledDeletion } from "@/actions/delete-account";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const _next = searchParams.get("next") ?? "/";

  let next = "/";

  try {
    if (_next.startsWith("http")) {
      const url = new URL(_next);
      if (url.origin === origin) {
        next = url.pathname + url.search;
      }
    } else if (_next.startsWith("/")) {
      next = _next;
    }
  } catch (e) {
    console.error("[confirm route] URL parsing error:", e);
    next = "/";
  }

  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // A verified link is a sign-in: recover the account if a deletion was
      // pending. Recovery links included — regaining access is still access.
      await cancelScheduledDeletion();
      // Password recovery must always land on the reset-password form,
      // regardless of what `next` resolved to (Supabase falls back to the
      // Site URL for `next` if the requested redirect isn't allow-listed).
      redirect(type === "recovery" ? "/auth/update-password" : next);
    } else {
      console.error("[confirm route] OTP Verification failed:", error.message);
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  redirect(`/auth/error?error=Missing token hash or type`);
}
