"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Mail, KeyRound, CreditCard } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { initiateCheckout } from "@/actions/checkout";
import { fetchClientSecret } from "@/actions/stripe";
import { CheckoutEmbed } from "@/components/checkout-embed";
import { NuraLogo } from "@/components/nura-logo";

type Step = "email" | "otp" | "payment";

interface CheckoutFlowProps {
  user: { id: string; email: string } | null;
}

export function CheckoutFlow({ user }: CheckoutFlowProps) {
  const [step, setStep] = useState<Step>(user ? "payment" : "email");
  const [email, setEmail] = useState(user?.email ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Authenticated users: fetch Stripe session on mount ──────────────────
  useEffect(() => {
    if (user && !clientSecret) {
      fetchClientSecret()
        .then((secret) => {
          if (secret) setClientSecret(secret);
          else setError("Failed to start payment. Please try again.");
        })
        .catch(() => setError("Failed to start payment. Please try again."));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 1: email submit ────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      // Create user + Stripe session server-side
      const result = await initiateCheckout(email);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setClientSecret(result.clientSecret);

      // Send OTP to the resolved email
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }, // user was already created above
      });

      if (otpError) {
        setError("Failed to send verification code. Please try again.");
        return;
      }

      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: OTP verify ──────────────────────────────────────────────────
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });

      if (verifyError) {
        setError("Invalid or expired code. Please try again.");
        return;
      }

      setStep("payment");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setOtpCode("");
    setIsLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        {step !== "email" && !user ? (
          <button
            onClick={() => {
              setStep(step === "otp" ? "email" : "otp");
              setError(null);
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}
        <Link
          href="/"
          className="flex items-center gap-1 px-4 py-2 bg-card rounded-full text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
        >
          Cancel
        </Link>
      </div>

      {/* Step indicator (guest flow only) */}
      {!user && (
        <div className="flex items-center justify-center gap-2 py-2">
          {(["email", "otp", "payment"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step
                    ? "bg-foreground"
                    : ["email", "otp", "payment"].indexOf(s) <
                        ["email", "otp", "payment"].indexOf(step)
                      ? "bg-foreground/40"
                      : "bg-muted-foreground/25"
                }`}
              />
              {i < 2 && <div className="w-6 h-px bg-muted-foreground/20" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-6 pb-12">
        {/* Logo */}
        <div className="mb-8">
          <NuraLogo size="lg" variant="full" />
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <>
              <div className="text-center space-y-1 mb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-card flex items-center justify-center">
                    <Mail className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Get full access
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email to get started — no password needed.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
                />

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!email || isLoading}
                  className="w-full flex items-center justify-center bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isLoading ? "Setting up..." : "Continue to payment →"}
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-foreground hover:underline"
                >
                  Sign in →
                </Link>
              </p>
            </>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <>
              <div className="text-center space-y-1 mb-6">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-card flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Check your email
                </h1>
                <p className="text-sm text-muted-foreground">
                  We sent an 8-digit code to{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleOtpVerify} className="space-y-3">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00000000"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none text-center text-2xl tracking-widest font-mono"
                />

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={otpCode.length < 8 || isLoading}
                  className="w-full flex items-center justify-center bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isLoading ? "Verifying..." : "Verify & continue →"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Resend code
                </button>
              </form>
            </>
          )}

          {/* ── Step 3: Payment ── */}
          {step === "payment" && (
            <>
              {clientSecret ? (
                <CheckoutEmbed clientSecret={clientSecret} />
              ) : (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Preparing payment...
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive text-center mt-4">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
