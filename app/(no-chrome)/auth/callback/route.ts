import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only allow same-origin, relative redirect targets (audit M4). Anything
// absolute, protocol-relative (`//evil.com`), or off-origin collapses to "/".
export function sanitizeNext(raw: string | null, origin: string): string {
  const fallback = "/";
  if (!raw) return fallback;
  try {
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      return url.origin === origin ? url.pathname + url.search : fallback;
    }
    // Must be a single-slash absolute path; reject `//host` and `/\` tricks.
    if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
      return raw;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

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
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        destination = sub ? next : "/checkout";
      }

      // Host-aware redirect — must wrap all return paths
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
