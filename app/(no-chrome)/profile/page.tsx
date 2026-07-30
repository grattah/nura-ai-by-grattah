"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { updateDisplayName, updatePassword } from "@/actions/profile";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { DeleteAccount } from "@/components/profile/delete-account";
import {
  PasswordRequirements,
  checkPasswordStrength,
  isPasswordValid,
} from "@/components/profile/password-requirements";

interface ProfileUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  avatarLetter: string;
  passwordUpdatedAt: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [namePending, setNamePending] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [pwPending, setPwPending] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const strength = checkPasswordStrength(newPw);
  const canUpdatePw =
    currentPw.trim().length > 0 &&
    isPasswordValid(strength) &&
    newPw === confirmPw &&
    !pwPending;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      const name =
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        u.email?.split("@")[0] ||
        "";
      setUser({
        id: u.id,
        email: u.email ?? "",
        fullName: name,
        avatarUrl: u.user_metadata?.avatar_url ?? null,
        avatarLetter: (name || u.email || "N").charAt(0).toUpperCase(),
        passwordUpdatedAt: u.user_metadata?.password_updated_at ?? null,
      });
      setFullName(name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameSave = async () => {
    if (!fullName.trim() || namePending) return;
    setNamePending(true);
    const result = await updateDisplayName(fullName.trim());
    setNamePending(false);
    if ("success" in result) setNameSaved(true);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdatePw) return;
    setPwPending(true);
    setPwError(null);

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPw,
    });

    if (signInError) {
      setPwError("Current password is incorrect.");
      setPwPending(false);
      return;
    }

    const result = await updatePassword(newPw, confirmPw);
    setPwPending(false);

    if ("error" in result) {
      setPwError(result.error);
      return;
    }

    // Supabase invalidates the session after password change
    await supabase.auth.signOut();
    router.push(`/log-back-in?email=${encodeURIComponent(user?.email ?? "")}`);
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-subtle border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center px-6 pt-5 pb-11 relative">
        <button
          onClick={() => router.back()}
          className="size-10 absolute left-4 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-base-text" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-xl font-semibold text-base-text">Profile</h1>
          <p className="text-sm text-subtle font-medium mt-0.5">
            Edit your profile
          </p>
        </div>
      </div>

      <div className="px-6 space-y-6 flex-1 flex flex-col">
        {/* Avatar */}
        <div className="flex justify-center">
          <AvatarUpload
            avatarUrl={user.avatarUrl}
            avatarLetter={user.avatarLetter}
            userId={user.id}
          />
        </div>

        {/* PROFILE section */}
        <div className="space-y-3">
          <p
            className="text-sm font-medium uppercase tracking-widest"
            style={{ color: "var(--mint-green)" }}
          >
            Profile
          </p>

          {/* Full name */}
          <div className="bg-card rounded-sm px-4 h-14 flex items-center border border-[#E2E4E4] gap-3">
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameSaved(false);
              }}
              onBlur={handleNameSave}
              className="flex-1 bg-transparent text-base text-base-text outline-none"
              placeholder="Full name"
            />
            {nameSaved && (
              <CheckCircle2
                className="w-4 h-4 shrink-0"
                style={{ color: "var(--mint-green)" }}
              />
            )}
            {namePending && (
              <div className="w-4 h-4 rounded-full border-2 border-subtle border-t-transparent animate-spin shrink-0" />
            )}
          </div>

          {/* Email (read-only) */}
          <div className="bg-card rounded-sm px-4 h-14 flex items-center border border-[#E2E4E4] gap-3">
            <span className="flex-1 text-base text-base-text">
              {user.email}
            </span>
            <CheckCircle2
              className="w-4 h-4 shrink-0"
              style={{ color: "var(--mint-green)" }}
            />
          </div>
        </div>

        {/* SECURITY section */}
        <div className="space-y-3">
          <p
            className="text-sm font-medium uppercase tracking-widest"
            style={{ color: "var(--mint-green)" }}
          >
            Security
          </p>

          {/* Change password collapsible */}
          <div className="bg-white rounded-2xl px-4 divide-y border border-[#E3E1D880] overflow-hidden">
            <button
              type="button"
              onClick={() => setPasswordOpen((v) => !v)}
              className="w-full flex items-center justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-sm p-2 bg-[#F3F1E8]">
                  <LockKeyhole className="size-5 text-grey-c500" />
                </div>

                <div className="text-left">
                  <p className="text-base font-medium text-base-text">
                    Change password
                  </p>
                  <p className="text-xs text-subtle">
                    {user.passwordUpdatedAt
                      ? `Last changed ${formatRelativeTime(user.passwordUpdatedAt)}`
                      : "Not changed yet"}
                  </p>
                </div>
              </div>
              {passwordOpen ? (
                <ChevronUp className="w-4 h-4 text-subtle" />
              ) : (
                <ChevronDown className="w-4 h-4 text-subtle" />
              )}
            </button>

            {passwordOpen && (
              <form
                onSubmit={handlePasswordUpdate}
                className="pb-4 space-y-3 pt-4"
              >
                {/* Current password */}
                <div className="space-y-1">
                  <label className="text-sm text-subtle">
                    Current password
                  </label>
                  <div className="flex items-center gap-3 bg-white rounded-sm px-4 h-12 border border-[#E2E4E4]">
                    <LockKeyhole className="size-4 text-subtle" />
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="flex-1 bg-transparent text-base outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="text-subtle"
                    >
                      {showCurrent ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1">
                  <label className="text-sm text-subtle">New password</label>
                  <div className="flex items-center gap-3 bg-white rounded-sm px-4 h-12 border border-[#E2E4E4]">
                    <LockKeyhole className="size-4 text-subtle" />
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="flex-1 bg-transparent text-base outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="text-subtle"
                    >
                      {showNew ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-1">
                  <label className="text-sm text-subtle">
                    Re-enter new password
                  </label>
                  <div className="flex items-center gap-3 rounded-sm bg-white px-4 h-12 border border-[#E2E4E4]">
                    <LockKeyhole className="size-4 text-subtle" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="flex-1 bg-transparent text-base outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="text-subtle"
                    >
                      {showConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <PasswordRequirements strength={strength} />

                {pwError && <p className="text-sm text-red-500">{pwError}</p>}

                <button
                  type="submit"
                  disabled={!canUpdatePw}
                  className="w-full py-4 rounded-full text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "var(--mint-green)" }}
                >
                  {pwPending ? "Updating…" : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-auto">
          <DeleteAccount />
        </div>
      </div>
    </div>
  );
}
