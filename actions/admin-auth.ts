"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { ownerExists } from "@/lib/admin/auth";
import { secureCompare } from "@/lib/secure-compare";

/**
 * One-time creation of the owner account. Gated by ADMIN_BOOTSTRAP_SECRET and by
 * the absence of an existing owner. After this succeeds, /admin/signup is locked
 * and only sign-in is available. The client signs in with the same credentials
 * afterwards to establish the session.
 */
export async function bootstrapOwner({
  email,
  password,
  secret,
}: {
  email: string;
  password: string;
  secret: string;
}): Promise<{ ok: true } | { error: string }> {
  const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!expected) {
    return { error: "Owner sign-up is not configured." };
  }
  if (!secureCompare(secret, expected)) {
    return { error: "Invalid setup key." };
  }
  if (!email?.trim() || !password || password.length < 8) {
    return { error: "Enter an email and a password of at least 8 characters." };
  }
  if (await ownerExists()) {
    return { error: "An owner already exists. Please sign in instead." };
  }

  const admin = createServiceRoleClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { admin_role: "owner" },
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Failed to create owner account." };
  }

  const { error: memberErr } = await admin.from("admin_members" as never).insert({
    user_id: data.user.id,
    role: "owner",
    email: data.user.email,
  } as never);

  if (memberErr) {
    // Roll back the auth user so the owner slot stays open for a retry.
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: "Failed to set up owner. Please try again." };
  }

  return { ok: true };
}
