"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  EyeOff,
  Eye,
  LockKeyhole,
  X,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import loader from "@/public/loader.png";

// "login-otp" → user exists but has no password (OAuth / checkout-created)
type AuthStep = "email" | "login" | "login-otp" | "signup";

interface NuraAuthFormProps {
  className?: string;
}

export function NuraAuthForm({ className }: NuraAuthFormProps) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  // ─── Step 1: resolve email ─────────────────────────────────────────────────

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

      const { exists, hasPassword } = await res.json();

      if (!exists) {
        setStep("signup");
        return;
      }

      if (hasPassword) {
        setStep("login");
        return;
      }

      // User exists but signed up via OAuth or checkout — send OTP
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        setError("Failed to send sign-in code. Please try again.");
        return;
      }

      setStep("login-otp");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP verification ──────────────────────────────────────────────────────

  const handleOtpVerify = async () => {
    if (!otpCode.trim()) return;
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: "email",
      });

      if (verifyError) {
        setError("Invalid or expired code. Please request a new one.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setIsLoading(false);
    setOtpCode("");
  };

  // ─── Password sign-in ──────────────────────────────────────────────────────

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
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error &&
          err.message.includes("Invalid login credentials")
          ? "Incorrect password. Please try again."
          : "Sign in failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Sign up ───────────────────────────────────────────────────────────────

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      if (data.session) {
        router.push("/checkout");
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

  // ─── Google ────────────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    setIsGoogleLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google."
      );
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (otpCode.length === 8) {
      handleOtpVerify();
    }
  }, [otpCode]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const goBack = () => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setOtpCode("");
    setError(null);
    if (step === "email") {
      router.back();
    }
  };

  const isEmailStep = step === "email";
  const isLoginOtpStep = step == "login-otp";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {/* Top bar */}
      <div className="flex items-center justify-end px-4 pb-4 mb-6">
        {isLoginOtpStep && (
          <button
            className="p-2 rounded-full bg-[#E8E6DC] hover:bg-[#D8D6CC]"
            onClick={goBack}
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center px-6 pb-12">
        <div className="relative flex justify-center w-full mb-8">
          {!isLoginOtpStep && (
            <button
              className="absolute left-0 p-2 bg-[#E8E6DC] rounded-full"
              onClick={goBack}
            >
              <ArrowLeft size={24} />
            </button>
          )}

          <div className="flex flex-col items-center text-center gap-1">
            {isLoginOtpStep && (
              <div className="p-3 rounded-full bg-[#227B6F] mb-2">
                <ShieldCheck color="#FFFFFF" size={24} />
              </div>
            )}
            <h1 className="text-xl font-semibold text-foreground text-center">
              {step === "email" && "Get full access"}
              {step === "login" && "Enter your password"}
              {step === "login-otp" && "Check your email"}
              {step === "signup" && "Welcome to Nuko"}
            </h1>
            <p className="text-muted-foreground text-center text-sm">
              {step === "email" && "Enter your email to continue"}
              {step === "login" && "Enter your password to login"}
              {step === "login-otp" && (
                <p>
                  We sent an 8-digit code to{" "}
                  <span className="text-[#1B1D1D] underline inline font-semibold">
                    {email}
                  </span>
                </p>
              )}
              {step === "signup" && "Create your profile to proceed"}
            </p>
          </div>

          <div />
        </div>

        <div className="w-full max-w-sm space-y-3">
          {/* ── Email step ── */}
          {step === "email" && (
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[#E8E6DC] text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <AppleIcon />
                  {isGoogleLoading ? "Connecting..." : "Continue with Apple"}
                </button>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[#E8E6DC] text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <GoogleIcon />
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </button>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="flex flex-col gap-2">
                <div>
                  <label
                    htmlFor=""
                    className="text-[#57605E] text-sm font-medium"
                  >
                    Your email address
                  </label>
                  <div className="relative">
                    <Mail
                      size={20}
                      color={email ? "#57605E" : "#9CA5A3"}
                      className="absolute top-4.75 left-3"
                    />
                    <input
                      type="email"
                      placeholder="name@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleEmailContinue()
                      }
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border focus:ring-2 focus:ring-ring outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleEmailContinue}
                  disabled={!email || isLoading}
                  className="w-full flex items-center justify-center bg-[#227B6F] text-[#FFFFFF] py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isLoading ? "Checking..." : "Continue"}
                </button>

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Password login step ── */}
          {step === "login" && (
            <div className="flex flex-col gap-10">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <p className="text-[#57605E] text-sm font-medium">
                    Your email address
                  </p>
                  <div className="w-full px-4 py-4 rounded-lg bg-muted text-sm flex gap-2 items-center">
                    <Mail size={20} color="#57605E" />
                    <p>{email}</p>
                  </div>
                </div>

                <label
                  htmlFor=""
                  className="text-[#57605E] text-sm font-medium"
                >
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={20}
                    color={password ? "#57605E" : "#9CA5A3"}
                    className="absolute top-4.75 left-3"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] focus:ring-2 focus:ring-ring outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-4.75 right-3"
                  >
                    {showPassword ? (
                      <Eye size={20} color="#57605E" />
                    ) : (
                      <EyeOff size={20} color="#9CA5A3" />
                    )}
                  </button>
                  <Link
                    href="/auth/forgot-password"
                    className="block text-sm underline text-[#227B6F] hover:text-foreground transition-colors pt-1"
                  >
                    Forgot your password?
                  </Link>
                </div>

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !password}
                  className="w-full flex items-center justify-center bg-[#227B6F] text-[#FFFFFF] py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <div className="flex flex-col gap-2 items-center">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[#E8E6DC] text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <AppleIcon />
                  {isGoogleLoading ? "Connecting..." : "Continue with Apple"}
                </button>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[#E8E6DC] text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <GoogleIcon />
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </button>
              </div>
            </div>
          )}

          {/* ── OTP login step ── */}
          {step === "login-otp" && (
            <form onSubmit={handleOtpVerify} className="space-y-3">
              {/* Icon */}
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter code here"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                autoFocus
                autoComplete="one-time-code"
                className="w-full px-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] focus:ring-2 focus:ring-ring outline-none text-center text-xl tracking-widest"
              />

              {isLoading && (
                <div
                  className="flex justify-center py-2"
                  role="status"
                  aria-label="Verifying code"
                >
                  <Image
                    src={loader}
                    alt=""
                    width={32}
                    height={32}
                    className="animate-spin"
                  />
                  <span className="sr-only">Verifying code...</span>
                </div>
              )}

              {error && !isLoading && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="w-full text-center text-sm text-[#227B6F] hover:text-foreground transition-colors disabled:opacity-50 underline font-medium"
              >
                Resend code
              </button>
            </form>
          )}

          {/* ── Signup step ── */}
          {step === "signup" && (
            <>
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <p className="text-[#57605E] text-sm font-medium">
                    Your email address
                  </p>
                  <div className="w-full px-4 py-4 rounded-lg bg-muted text-sm flex gap-2 items-center">
                    <Mail size={20} color="#57605E" />
                    <p>{email}</p>
                  </div>
                </div>

                <label
                  htmlFor=""
                  className="text-[#57605E] text-sm font-medium"
                >
                  Create Password
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={20}
                    color={password ? "#57605E" : "#9CA5A3"}
                    className="absolute top-4.75 left-3"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] focus:ring-2 focus:ring-ring outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute top-4.75 right-3"
                  >
                    {showPassword ? (
                      <Eye size={20} color="#57605E" />
                    ) : (
                      <EyeOff size={20} color="#9CA5A3" />
                    )}
                  </button>
                </div>

                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Password must be at least 8 characters
                  </p>
                )}

                <label
                  htmlFor=""
                  className="text-[#57605E] text-sm font-medium"
                >
                  Your full name
                </label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                  required
                  className="w-full px-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] focus:ring-2 focus:ring-ring outline-none"
                />

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading || !fullName || !password
                  }
                  className="w-full flex items-center justify-center bg-[#227B6F] text-[#FFFFFF] py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isLoading ? "Creating account..." : "Create profile"}
                </button>
              </form>
              <button
                className="w-full flex items-center justify-center bg-[#E8E6DC] py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                onClick={goBack}
              >
                Do this later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

function AppleIcon() {
  return (
    <svg className="h-6.5 w-6.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="currentColor"
      />
    </svg>
  );
}
