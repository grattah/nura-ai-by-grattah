"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAllowedAdminEmail } from "@/lib/admin/allowlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const clean = email.trim().toLowerCase();
    if (!isAllowedAdminEmail(clean)) {
      setError("That address cannot access the admin dashboard.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: false },
    });
    setLoading(false);

    if (otpError) {
      setError(
        /rate|seconds|already/i.test(otpError.message)
          ? "A code was just sent. Check your inbox, or wait a minute to request another."
          : "We couldn't send a code. Please try again.",
      );
      return;
    }

    setStep("code");
    setNotice(`We sent a 6-digit code to ${clean}.`);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });

    if (verifyError) {
      setError("Invalid or expired code. Request a new one.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <form
        onSubmit={step === "email" ? sendCode : verify}
        className="w-full max-w-sm bg-card rounded-3xl border border-border p-6 space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">Nuko Admin</h1>
          <p className="text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your email to receive a sign-in code."
              : "Enter the 6-digit code from your email."}
          </p>
        </div>

        {step === "email" ? (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="code">Sign-in code</Label>
            <Input
              id="code"
              // `inputMode` + `one-time-code` let phones surface the code from
              // the notification rather than making the user switch apps.
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
        )}

        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? step === "email"
              ? "Sending code…"
              : "Verifying…"
            : step === "email"
              ? "Send code"
              : "Sign in"}
        </Button>

        {step === "code" && (
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
              setNotice(null);
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        )}
      </form>
    </div>
  );
}
