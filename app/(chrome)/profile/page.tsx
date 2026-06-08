import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // ── Check whether the user has a password set ─────────────────────────
  // "email" identity = signed up with email+password (not OAuth-only)
  const adminSupabase = createServiceRoleClient();
  const { data: adminUser } = await adminSupabase.auth.admin.getUserById(
    user.id,
  );
  const hasPassword =
    adminUser.user?.identities?.some((i) => i.provider === "email") ?? false;

  let subscription: {
    status: string;
    plan: string | null;
    expires_at: string | null;
  } | null = null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  subscription = sub;

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "";

  const avatarLetter = (displayName || user.email || "N")
    .charAt(0)
    .toUpperCase();

  return (
    <ProfileForm
      user={{
        name: displayName,
        email: user.email ?? "",
        hasPassword,
        avatarLetter,
      }}
      subscription={subscription}
    />
  );
}
