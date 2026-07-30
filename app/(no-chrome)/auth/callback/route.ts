import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { sanitizeNext } from "@/lib/safe-redirect";
import { ensureWelcomeEmail } from "@/actions/welcome";
import { cancelScheduledDeletion } from "@/actions/delete-account";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Determine destination before deciding how to redirect
      let destination = next;

      if (user) {
        // Signing in within the grace period recovers a deleted account. This is
        // the OAuth/magic-link arm of the same rule the client form applies.
        await cancelScheduledDeletion();
        // First-time accounts (incl. Google sign-ups) get the welcome email once.
        await ensureWelcomeEmail();
        const active = await hasActiveSubscription(supabase, user.id);
        destination = active ? next : "/checkout";
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${destination}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`);
      } else {
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/error?message=Could not authenticate with provider`,
  );
}
