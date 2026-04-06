"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Apple, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NuraLogo } from "./nura-logo";
import { cn } from "@/lib/utils";

// The three distinct UI states of the form
type AuthStep = "email" | "login" | "signup";

interface NuraAuthFormProps {
  className?: string;
}

export function NuraAuthForm({ className }: NuraAuthFormProps) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  // ─── Step 1: Check if email exists ────────────────────────────────────────

  const handleEmailContinue = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
        return;
      }

      if (!res.ok) {
        setError("Something went wrong. Please try again.");
        return;
      }

      const { exists } = await res.json();
      setStep(exists ? "login" : "signup");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const claimTokens = async (userEmail: string) => {
    try {
      await fetch("/api/access/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
    } catch {
      // Non-fatal — token remains anonymous, user can restore manually
      console.warn("[claimTokens] Failed to claim tokens for", userEmail);
    }
  };

  // ─── Step 2a: Sign in with password ───────────────────────────────────────

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      claimTokens(email);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      // Give a friendly message rather than exposing Supabase error strings
      setError(
        err instanceof Error &&
          err.message.includes("Invalid login credentials")
          ? "Incorrect password. Please try again."
          : "Sign in failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2b: Create account ───────────────────────────────────────────────

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // Supabase returns a session immediately if email confirmation is off.
      // If email confirmation is on, data.session will be null — redirect to success page.
      if (data.session) {
        claimTokens(email);
        router.push("/");
        router.refresh();
      } else {
        router.push("/auth/verify-email");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Account creation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Google Sign-In ────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    setIsGoogleLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google.",
      );
      setIsGoogleLoading(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const goBack = () => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setError(null);
  };

  const isEmailStep = step === "email";
  const isLoginStep = step === "login";
  const isSignupStep = step === "signup";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {/* Top bar — Skip or Back depending on step */}
      <div className="flex items-center justify-between p-4 pt-6">
        {!isEmailStep ? (
          <button
            onClick={goBack}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div /> // spacer to keep Skip right-aligned on the email step
        )}
        <Link
          href="/"
          className="flex items-center gap-1 px-4 py-2 bg-card rounded-full text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
        >
          Skip <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Logo */}
        <div className="mb-8">
          <NuraLogo size="lg" variant="full" />
        </div>

        {/* Heading — changes per step */}
        <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
          {isEmailStep && "Sign in or create an account"}
          {isLoginStep && "Welcome back"}
          {isSignupStep && "Create your account"}
        </h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          {isEmailStep && "Save and retrieve your research"}
          {isLoginStep && email}
          {isSignupStep && email}
        </p>

        <div className="w-full max-w-sm space-y-3">
          {/* ── Email step ── */}
          {isEmailStep && (
            <>
              {/* Google — primary action, visually dominant */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <GoogleIcon />
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </button>

              {/* Apple — UI only, not implemented */}
              <button
                disabled
                title="Coming soon"
                className="w-full flex items-center justify-center gap-3 bg-card text-foreground py-4 rounded-full font-medium border border-border opacity-50 cursor-not-allowed"
              >
                <Apple className="h-5 w-5" />
                Continue with Apple
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* Email input */}
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
                autoComplete="email"
                className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />

              <button
                onClick={handleEmailContinue}
                disabled={!email || isLoading}
                className="w-full flex items-center justify-center bg-card text-foreground py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isLoading ? "Checking..." : "Continue with email"}
              </button>
            </>
          )}

          {/* ── Login step ── */}
          {isLoginStep && (
            <form onSubmit={handleSignIn} className="space-y-3">
              {/* Readonly email — makes it clear which account they're signing into */}
              <div className="w-full px-4 py-4 rounded-2xl bg-muted text-muted-foreground text-sm">
                {email}
              </div>

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
                required
                className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full flex items-center justify-center bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>

              {/* Visible forgot password — important for 40+ users */}
              <Link
                href="/auth/forgot-password"
                className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
              >
                Forgot your password?
              </Link>
            </form>
          )}

          {/* ── Signup step ── */}
          {isSignupStep && (
            <form onSubmit={handleSignUp} className="space-y-3">
              {/* Readonly email */}
              <div className="w-full px-4 py-4 rounded-2xl bg-muted text-muted-foreground text-sm">
                {email}
              </div>

              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                autoFocus
                required
                className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />

              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />

              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="w-full px-4 py-4 rounded-2xl bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />

              {/* Live password hint */}
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-muted-foreground text-center">
                  Password must be at least 8 characters
                </p>
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={
                  isLoading || !fullName || !password || !confirmPassword
                }
                className="w-full flex items-center justify-center bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          {/* Global error (email step only) */}
          {isEmailStep && error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline Google icon ──────────────────────────────────────────────────────
// Kept inline to avoid an extra import for a single-use SVG

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
