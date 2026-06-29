import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient as createClientImport } from "@supabase/supabase-js";
import { Database } from "../database.types";
import { hasActiveSubscription } from "../subscription";

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
  async (): Promise<{ isAuthenticated: boolean; hasAccess: boolean }> => {
    const {
      data: { user },
    } = await getCachedUser();
    if (!user) return { isAuthenticated: false, hasAccess: false };

    const supabase = await createClient();
    return {
      isAuthenticated: true,
      hasAccess: await hasActiveSubscription(supabase, user.id),
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
