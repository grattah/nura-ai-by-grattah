import Link from "next/link";
import Image from "next/image";
import Tokens from "@/components/vectors/Tokens";
import { ArrowLeft, Crown, HelpCircle, Heart, Shield } from "lucide-react";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { SettingsRow } from "@/components/account/settings-row";
import { LogoutButton } from "@/components/auth/logout-button";
import BackButton from "@/components/back-button";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasPassword = false;
  let subscription: { status: string; plan: string | null } | null = null;

  if (user) {
    const adminSupabase = createServiceRoleClient();
    // The identity lookup and the subscription read are independent — run them
    // together to save a round-trip.
    const [{ data: adminUser }, { data: subs }] = await Promise.all([
      adminSupabase.auth.admin.getUserById(user.id),
      supabase
        .from("subscriptions")
        .select("status, plan")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    hasPassword =
      adminUser.user?.identities?.some((i) => i.provider === "email") ?? false;
    subscription = subs?.[0] ?? null;
  }

  const isGuest = !user;
  const isIncomplete = user && (!hasPassword || !user.user_metadata?.full_name);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const avatarLetter = (displayName || user?.email || "N")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-4 gap-3 mb-3.5">
        <BackButton
          backPage="/"
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
        />
        <h1 className="flex-1 text-center text-xl font-semibold text-base-text capitalize">
          Account
        </h1>
        <div className="size-10 shrink-0" aria-hidden />
      </div>

      <div className="px-6 space-y-4">
        {/* User card */}
        <div className="bg-card rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar */}
            <div
              className="size-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
              style={{ backgroundColor: "#5C6B3A" }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={44}
                  height={44}
                  className="object-cover size-full"
                />
              ) : isGuest ? (
                <span className="text-sm">🌿</span>
              ) : (
                <span
                  className="text-lg font-bold"
                  style={{ color: "#D4C48A" }}
                >
                  {avatarLetter}
                </span>
              )}
            </div>
            {/* Text */}
            <div className="min-w-0">
              <p className="text-base font-medium text-base-text">
                {isGuest ? "Guest" : isIncomplete ? "Signed in" : displayName}
              </p>
              <p className="text-sm text-subtle font-medium truncate">
                {isGuest
                  ? "Sign in to have a Nuko account"
                  : isIncomplete
                    ? "Complete your account set up"
                    : user?.email}
              </p>
            </div>
          </div>

          {/* Action */}
          {isGuest && (
            <Link
              href="/auth/login"
              className="text-base font-semibold shrink-0 text-mint-green"
            >
              Sign in
            </Link>
          )}
          {isIncomplete && !isGuest && (
            <Link
              href="/setup-profile"
              className="text-base font-semibold shrink-0 text-mint-green"
            >
              Set up
            </Link>
          )}
          {!isGuest && !isIncomplete && (
            <Link
              href="/profile"
              className="text-base font-semibold shrink-0 text-mint-green"
            >
              Edit
            </Link>
          )}
        </div>

        {/* Manage subscription */}
        <Link
          href="/manage-subscription"
          className="flex items-center justify-between border border-[#E3E1D880] bg-linear-to-r from-mint-green to-mint-green-2 p-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="size-12 grid place-items-center rounded-lg border border-white/2 bg-mint-green">
              <Crown className="w-5 h-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-base font-medium text-white">
                Manage subscription
              </p>
              <p className="text-sm text-white font-medium">
                Access to 1000+ premium recipes
              </p>
            </div>
          </div>
          <ArrowLeft className="size-4 text-white rotate-180" />
        </Link>

        {/* Settings section */}
        <div className="space-y-2 mt-6">
          <p className="text-base font-semibold text-base-text px-1">
            Settings
          </p>
          <SettingsRow
            icon={<Heart className="size-4 text-grey-c500" strokeWidth={2} />}
            label="Health profile"
            href="/health-profile"
          />
          <SettingsRow
            icon={<Tokens className="size-4 text-grey-c500" />}
            label="Tokens"
            href="/tokens"
          />
          <SettingsRow
            icon={
              <HelpCircle className="size-4 text-grey-c500" strokeWidth={2} />
            }
            label="Help & guidance"
            href="/help-and-guidance"
          />
          <SettingsRow
            icon={<Shield className="size-4 text-grey-c500" strokeWidth={2} />}
            label="Terms and privacy"
            href="/terms-and-privacy"
          />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
