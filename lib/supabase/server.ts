import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient as createClientImport } from "@supabase/supabase-js";
import { Database } from "../database.types";
import { hasActiveSubscription, hasEverSubscribed } from "../subscription";

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
/**
 * `auth.getUser()` memoized per request (React `cache()`), so layouts, pages,
 * and server actions invoked during the same render only hit Supabase once.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

/**
 * Authoritative auth + subscription state for the current request, memoized per
 * render (React `cache()`). This is the server source of truth that hydrates the
 * client `useAccess` hook (see `AccessProvider`), so access checks react to
 * server-action sign-out/sign-in instantly without a page reload.
 */
export const getCachedAccess = cache(
  async (): Promise<{
    isAuthenticated: boolean;
    hasAccess: boolean;
    hasEverSubscribed: boolean;
  }> => {
    const {
      data: { user },
    } = await getCachedUser();
    if (!user)
      return {
        isAuthenticated: false,
        hasAccess: false,
        hasEverSubscribed: false,
      };

    const supabase = await createClient();
    // Access = active subscription OR unspent free-trial units. Read the free
    // balance directly (RLS lets a user read their own credits row) to avoid a
    // circular import with credits-server, which imports from this module.
    const [activeSub, everSubscribed, { data: creditRow }] = await Promise.all([
      hasActiveSubscription(supabase, user.id),
      hasEverSubscribed(supabase, user.id),
      supabase
        .from("credits")
        .select("free_granted, free_used")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const freeRemaining = creditRow
      ? Math.max(0, creditRow.free_granted - creditRow.free_used)
      : 0;

    return {
      isAuthenticated: true,
      hasAccess: activeSub || freeRemaining > 0,
      hasEverSubscribed: everSubscribed,
    };
  },
);

export function createServiceRoleClient() {
  return createClientImport<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
