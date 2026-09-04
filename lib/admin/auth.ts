import "server-only";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { atLeast, type AdminRole } from "@/lib/admin/roles";
import { isAllowedAdminEmail } from "@/lib/admin/allowlist";

export interface AdminIdentity {
  userId: string;
  email: string | null;
  role: AdminRole;
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const {
    data: { user },
  } = await getCachedUser();
  if (!user) return null;
  if (!isAllowedAdminEmail(user.email)) return null;

  const admin = createServiceRoleClient();
  // admin_members isn't in the generated types yet (migration 20260616120000),
  // so the table name is cast until `npm run generate-types` is re-run.
  const { data } = await admin
    .from("admin_members" as never)
    .select("role, email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    userId: user.id,
    email: (data as { email: string | null }).email ?? user.email ?? null,
    role: (data as { role: AdminRole }).role,
  };
}

export type RequireAdminResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; error: string };

/**
 * Gate a server action by minimum role. Returns the identity on success or a
 * typed error to surface to the client.
 */
export async function requireAdmin(
  min: AdminRole = "viewer",
): Promise<RequireAdminResult> {
  const identity = await getAdminIdentity();
  if (!identity) return { ok: false, error: "Not authorized." };
  if (!atLeast(identity.role, min)) {
    return { ok: false, error: "You don't have permission to do that." };
  }
  return { ok: true, identity };
}
