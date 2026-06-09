"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword, updateDisplayName } from "@/actions/profile";
import {
  PasswordRequirements,
  checkPasswordStrength,
  isPasswordValid,
} from "@/components/profile/password-requirements";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function SetupProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = checkPasswordStrength(password);
  const canSubmit =
    isPasswordValid(strength) && fullName.trim().length > 0 && !isPending;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setEmail(user.email ?? "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsPending(true);
    setError(null);

    const [pwResult, nameResult] = await Promise.all([
      updatePassword(password, password),
      updateDisplayName(fullName.trim()),
    ]);

    setIsPending(false);

    if ("error" in pwResult) {
      setError(pwResult.error);
      return;
    }
    if ("error" in nameResult) {
      setError(nameResult.error);
      return;
    }

    setDone(true);
  };

  return (
    <>
      <div className="min-h-dvh bg-background pb-10">
        {/* Header */}
        <div className="flex items-center px-4 pt-5 pb-11">
          <button
            onClick={() => router.back()}
            className="size-10 shrink-0 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="size-5 text-foreground" />
          </button>

          <div className="flex-1 text-center min-w-0">
            <h1 className="text-xl font-semibold text-base-text">
              Set up your profile
            </h1>
            <p className="text-sm text-subtle font-medium mt-1">
              Personalize your experience
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-4 space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              Your email address
            </label>
            <div className="flex items-center gap-3 bg-card rounded-lg px-4 h-13 border border-border">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-base text-foreground">{email}</span>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              Create password
            </label>
            <div className="flex items-center gap-3 bg-card rounded-lg px-4 h-13 border border-border">
              <LockKeyhole className="shrink-0 size-4 text-muted-foreground" />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="shrink-0 text-muted-foreground hover:opacity-75"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">
              Your full name
            </label>
            <div className="flex items-center gap-3 bg-card rounded-lg px-4 h-13 border border-border">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Arya Stark"
                className="flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Password requirements */}
          <PasswordRequirements strength={strength} />

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 rounded-full text-white font-semibold text-base transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--mint-green)" }}
          >
            {isPending ? "Setting up…" : "Set up profile"}
          </button>
        </form>
      </div>

      {/* Success dialog */}
      <Dialog open={done}>
        <DialogContent className="sm:max-w-sm p-8 text-center space-y-4 [&>button]:hidden">
          {/* Confetti check */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#22C55E" }}
              >
                <span className="text-3xl text-white">✓</span>
              </div>
              <span className="absolute -top-2 -right-1 text-lg">✨</span>
              <span className="absolute -top-1 left-0 text-lg">🎉</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Set up completed!
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Your account is now fully set up. You can upload your profile
              picture now if you wish.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push("/profile")}
              className="w-full py-4 rounded-full text-white font-semibold"
              style={{ backgroundColor: "var(--mint-green)" }}
            >
              Upload profile picture
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 rounded-full bg-muted text-foreground font-semibold"
            >
              Do this later
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
