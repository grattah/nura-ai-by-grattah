import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { sanitizeNext } from "@/lib/safe-redirect";
import { ensureWelcomeEmail } from "@/actions/welcome";

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
        // First-time accounts (incl. Google sign-ups) get the welcome email once.
        await ensureWelcomeEmail();
        const active = await hasActiveSubscription(supabase, user.id);
        destination = active ? next : "/checkout";
      }

      // Host-aware redirect — must wrap all return paths. Only trust
      // x-forwarded-host if it matches our known app host (audit L2: a spoofed
      // header would otherwise redirect the post-auth user to an attacker host).
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      let appHost: string | null = null;
      try {
        appHost = process.env.NEXT_PUBLIC_APP_URL
          ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
          : null;
      } catch {
        appHost = null;
      }
      const trustForwarded = !!forwardedHost && forwardedHost === appHost;

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${destination}`);
      } else if (trustForwarded) {
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
