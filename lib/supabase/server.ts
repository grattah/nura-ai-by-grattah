import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient as createClientImport } from "@supabase/supabase-js";
import { Database } from "../database.types";
import { hasActiveSubscription, hasEverSubscribed } from "../subscription";

/** Create per request; don't cache in a global (Fluid compute). */
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
          }
        },
      },
    },
  );
}
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

export const getCachedAccess = cache(
  async (): Promise<{
    isAuthenticated: boolean;
    hasAccess: boolean;
    hasEverSubscribed: boolean;
    isSubscriber: boolean;
  }> => {
    const {
      data: { user },
    } = await getCachedUser();
    if (!user)
      return {
        isAuthenticated: false,
        hasAccess: false,
        hasEverSubscribed: false,
        isSubscriber: false,
      };

    const supabase = await createClient();

    const [activeSub, everSubscribed] = await Promise.all([
      hasActiveSubscription(supabase, user.id),
      hasEverSubscribed(supabase, user.id),
    ]);

    return {
      isAuthenticated: true,
      hasAccess: activeSub || !everSubscribed,
      hasEverSubscribed: everSubscribed,
      isSubscriber: activeSub,
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
