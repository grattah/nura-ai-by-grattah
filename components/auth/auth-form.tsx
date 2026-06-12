"use client";

import { useState, useEffect, useRef } from "react";
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

type AuthStep = "email" | "login" | "login-otp" | "signup-otp" | "signup";

interface NuraAuthFormProps {
  className?: string;
}

// Remember an in-progress OTP step so a refresh or browser-back restores the
// code-entry screen instead of dropping the user on the email step — which would
// force a redundant re-send and hit Supabase's 60s OTP cooldown.
const OTP_PENDING_KEY = "nura-auth-pending";
const OTP_PENDING_TTL = 15 * 60 * 1000; // OTPs are valid for ~1h; 15m is a safe window.

type OtpStep = "signup-otp" | "login-otp";

function savePendingOtp(email: string, step: OtpStep) {
  try {
    sessionStorage.setItem(
      OTP_PENDING_KEY,
      JSON.stringify({ email, step, ts: Date.now() }),
    );
  } catch {
    /* sessionStorage unavailable — non-critical */
  }
}

function clearPendingOtp() {
  try {
    sessionStorage.removeItem(OTP_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function isRateLimited(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string };
  return (
    e.status === 429 ||
    (typeof e.code === "string" && e.code.includes("rate_limit"))
  );
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

  // OTP autofill can trigger verification twice (the otpCode effect and the
  // form's onSubmit both fire for the same code). OTP tokens are single-use,
  // so the loser of that race gets "invalid or expired" — guard against
  // running verifyOtp more than once per code.
  const verifyInFlightRef = useRef(false);

  // Restore an in-progress OTP screen after a refresh / browser-back so the user
  // can enter the code they were already sent (no re-send, no cooldown error).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(OTP_PENDING_KEY);
      if (!raw) return;
      const { email: e, step: s, ts } = JSON.parse(raw);
      if (
        e &&
        (s === "signup-otp" || s === "login-otp") &&
        Date.now() - ts < OTP_PENDING_TTL
      ) {
        setEmail(e);
        setStep(s);
      } else {
        clearPendingOtp();
      }
    } catch {
      /* ignore malformed state */
    }
  }, []);

  // ─── Step 1: resolve email ─────────────────────────────────────────────────

  const handleEmailContinue = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

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
        // New user — verify the email with an OTP before creating a profile
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });

        if (otpError) {
          setError(
            isRateLimited(otpError)
              ? "Please wait a minute before requesting another code."
              : "Failed to send verification code. Please try again.",
          );
          return;
        }

        savePendingOtp(email, "signup-otp");
        setStep("signup-otp");
        return;
      }

      if (hasPassword) {
        setStep("login");
        return;
      }

      // User exists but signed up via OAuth or checkout — send OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });

      if (otpError) {
        // A cooldown almost always means a code from a prior attempt is already
        // in their inbox — let them enter it instead of dead-ending here.
        if (isRateLimited(otpError)) {
          savePendingOtp(email, "login-otp");
          setStep("login-otp");
          setError(
            "You already have a code in your inbox — enter it below, or wait a minute to resend.",
          );
          return;
        }
        setError("Failed to send sign-in code. Please try again.");
        return;
      }

      savePendingOtp(email, "login-otp");
      setStep("login-otp");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Shared post-auth redirect ─────────────────────────────────────────────

  const redirectAfterAuth = async (
    supabase: ReturnType<typeof createClient>,
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let destination = "/";
    if (user) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      destination = sub ? "/" : "/checkout";
    }

    router.push(destination);
    router.refresh();
  };

  // ─── OTP Form submit ──────────────────────────────────────────────────────

  const handleOtpFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Read directly from the DOM to bypass React's asynchronous state delays
    const formData = new FormData(e.currentTarget);
    const rawOtp = formData.get("otp") as string;
    const finalCode = (rawOtp || otpCode).replace(/\D/g, "").slice(0, 8);

    if (finalCode.length === 8) {
      if (step === "signup-otp") {
        handleSignupOtpVerify(finalCode);
      } else {
        handleOtpVerify(finalCode);
      }
    }
  };

  // ─── OTP verification ──────────────────────────────────────────────────────

  const handleOtpVerify = async (codeToVerify?: string) => {
    const token = codeToVerify || otpCode.trim();
    if (!token) return;
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;

    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (verifyError) {
        setError("Invalid or expired code. Please request a new one.");
        return;
      }

      clearPendingOtp();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const needsSetup =
        user?.user_metadata?.has_password !== true &&
        !user?.user_metadata?.full_name;
      if (needsSetup) {
        setStep("signup");
        return;
      }

      await redirectAfterAuth(supabase);
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
      verifyInFlightRef.current = false;
    }
  };

  // New user verifying their email before creating a profile
  const handleSignupOtpVerify = async (codeToVerify?: string) => {
    const token = codeToVerify || otpCode.trim();
    if (!token) return;
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;

    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (verifyError) {
        setError("Invalid or expired code. Please request a new one.");
        return;
      }

      clearPendingOtp();
      setStep("signup");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
      verifyInFlightRef.current = false;
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: step === "signup-otp" },
    });
    if (otpError) {
      setError(
        isRateLimited(otpError)
          ? "Please wait a minute before requesting another code."
          : "Couldn't resend the code. Please try again.",
      );
    }
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
      await redirectAfterAuth(supabase);
    } catch (err: unknown) {
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
      const { error } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName, has_password: true },
      });

      if (error) throw error;

      await redirectAfterAuth(supabase);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Account creation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipProfile = async () => {
    const supabase = createClient();
    await redirectAfterAuth(supabase);
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
        err instanceof Error ? err.message : "Failed to sign in with Google.",
      );
      setIsGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (otpCode.length === 8) {
      if (step === "signup-otp") {
        handleSignupOtpVerify(otpCode);
      } else {
        handleOtpVerify(otpCode);
      }
    }
  }, [otpCode]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const goBack = () => {
    clearPendingOtp();
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
  const isOtpStep = step === "login-otp" || step === "signup-otp";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={cn("min-h-screen flex flex-col", className)}>
      {/* Top bar */}
      <div className="flex items-center justify-end px-4 py-4">
        {isOtpStep && (
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
          {!isOtpStep && (
            <button
              className="absolute left-0 p-2 bg-[#E8E6DC] rounded-full"
              onClick={goBack}
            >
              <ArrowLeft size={24} />
            </button>
          )}

          <div className="flex flex-col items-center text-center gap-1.75">
            {isOtpStep && (
              <div className="p-3 rounded-full bg-mint-green mb-2">
                <ShieldCheck color="#FFFFFF" size={24} />
              </div>
            )}
            <h1 className="text-xl font-semibold text-base-text text-center">
              {step === "email" && "Get full access"}
              {step === "login" && "Enter your password"}
              {isOtpStep && "Check your email"}
              {step === "signup" && "Welcome to Nuko"}
            </h1>
            <p className="text-subtle font-medium text-center text-sm">
              {step === "email" && "Enter your email to continue"}
              {step === "login" && "Enter your password to login"}
              {isOtpStep && (
                <>
                  We sent an 8-digit code to{" "}
                  <span className="text-[#1B1D1D] underline inline font-semibold">
                    {email}
                  </span>
                </>
              )}
              {step === "signup" && "Create your profile to proceed"}
            </p>
          </div>

          <div />
        </div>

        <div className="w-full max-w-sm space-y-3">
          {/* ── Email step ── */}
          {step === "email" && (
            <div className="flex flex-col gap-y-11">
              <div className="flex flex-col gap-2 items-center">
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

              <div className="flex flex-col gap-y-4">
                <div className="space-y-1">
                  <label htmlFor="" className="text-subtle text-sm font-medium">
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
                      className="w-full pl-10 pr-4 py-4 rounded-lg bg-white text-base-text placeholder:text-muted-foreground border border-[#E2E4E4] outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleEmailContinue}
                  disabled={!email || isLoading}
                  className="w-full flex items-center justify-center bg-mint-green text-white py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity disabled:opacity-40"
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
            <div className="flex flex-col gap-y-11">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div>
                  <p className="text-subtle text-sm font-medium">
                    Your email address
                  </p>
                  <div className="w-full px-4 py-4 rounded-lg bg-muted text-sm flex gap-2 items-center">
                    <Mail size={20} color="#57605E" />
                    <p>{email}</p>
                  </div>
                </div>

                <label htmlFor="" className="text-subtle text-sm font-medium">
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-4 rounded-lg bg-white text-base-text placeholder:text-muted-foreground border border-[#E2E4E4] outline-none"
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
                    className="block text-sm underline text-mint-green hover:text-foreground transition-colors pt-1"
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
                  className="w-full flex items-center justify-center bg-mint-green text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
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
                  <GoogleIcon />
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </button>
              </div>
            </div>
          )}

          {/* ── OTP step (login or signup) ── */}
          {isOtpStep && (
            <form onSubmit={handleOtpFormSubmit} className="space-y-3">
              {/* Icon */}
              <input
                name="otp"
                type="text"
                inputMode="numeric"
                placeholder="Enter code here"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                autoFocus
                autoComplete="one-time-code"
                className="w-full px-4 py-4 rounded-lg bg-white text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] outline-none text-center text-xl tracking-widest"
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] outline-none"
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
                  className="w-full px-4 py-4 rounded-lg bg-[#FFFFFF] text-foreground placeholder:text-muted-foreground border border-[#E2E4E4] outline-none"
                />

                {error && (
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !fullName || !password}
                  className="w-full flex items-center justify-center bg-[#227B6F] text-[#FFFFFF] py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isLoading ? "Creating account..." : "Create profile"}
                </button>
              </form>
              <button
                className="w-full flex items-center justify-center bg-[#E8E6DC] py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                onClick={handleSkipProfile}
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
