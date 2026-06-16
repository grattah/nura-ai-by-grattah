"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { ASSIGNABLE_ROLES, type AdminRole } from "@/lib/admin/roles";

type Result = { success: true } | { error: string };

function isAssignable(role: string): role is AdminRole {
  return (ASSIGNABLE_ROLES as string[]).includes(role);
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createServiceRoleClient>,
  email: string,
): Promise<string | null> {
  // No direct getByEmail; scan pages (admin user base is small).
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const match = data?.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (!data || data.users.length < 200) break;
  }
  return null;
}

export async function inviteAdmin(
  email: string,
  role: string,
): Promise<Result> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };
  if (!email?.trim()) return { error: "Email is required." };
  if (!isAssignable(role)) return { error: "Invalid role." };

  const admin = createServiceRoleClient();
  const cleanEmail = email.trim().toLowerCase();

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? (await headers()).get("origin") ?? "";
  const redirectTo = `${base}/admin/accept`;

  // Try to invite a brand-new user; fall back to an existing account.
  let userId: string | null = null;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
    redirectTo,
  });
  if (data?.user) {
    userId = data.user.id;
  } else if (error) {
    userId = await findUserIdByEmail(admin, cleanEmail);
    if (!userId) return { error: error.message };
  }
  if (!userId) return { error: "Could not resolve the invited user." };

  const { error: upsertErr } = await admin
    .from("admin_members" as never)
    .upsert(
      {
        user_id: userId,
        role,
        email: cleanEmail,
        invited_by: gate.identity.userId,
      } as never,
      { onConflict: "user_id" } as never,
    );
  if (upsertErr) return { error: upsertErr.message };

  revalidatePath("/admin/members");
  return { success: true };
}

export async function changeRole(
  userId: string,
  role: string,
): Promise<Result> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };
  if (!isAssignable(role)) return { error: "Invalid role." };

  const admin = createServiceRoleClient();
  // Never modify the owner.
  const { data: target } = await admin
    .from("admin_members" as never)
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if ((target as { role?: string } | null)?.role === "owner") {
    return { error: "The owner cannot be changed." };
  }

  const { error } = await admin
    .from("admin_members" as never)
    .update({ role } as never)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}

export async function removeAdmin(userId: string): Promise<Result> {
  const gate = await requireAdmin("admin");
  if (!gate.ok) return { error: gate.error };
  if (userId === gate.identity.userId) {
    return { error: "You can't remove yourself." };
  }

  const admin = createServiceRoleClient();
  const { data: target } = await admin
    .from("admin_members" as never)
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if ((target as { role?: string } | null)?.role === "owner") {
    return { error: "The owner cannot be removed." };
  }

  const { error } = await admin
    .from("admin_members" as never)
    .delete()
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/members");
  return { success: true };
}
