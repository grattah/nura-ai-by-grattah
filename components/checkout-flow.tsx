"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, X, Mail, KeyRound } from "lucide-react";
import { HiSparkles } from "react-icons/hi";
import { FaBookOpen, FaBookmark, FaHeart } from "react-icons/fa";
import CoinStack from "./vectors/CoinStack";
import FilledLock from "@/components/vectors/filled-lock";
import { createClient } from "@/lib/supabase/client";
import { initiateCheckout } from "@/actions/checkout";
import { fetchClientSecretForPlan } from "@/actions/stripe";
import { CheckoutEmbed } from "@/components/checkout-embed";
import { NuraLogo } from "@/components/nura-logo";
import image from "@/public/planImage.webp";

type Plan = "annual" | "monthly";
type Step = "plan" | "email" | "otp" | "payment";

interface CheckoutFlowProps {
  user: { id: string; email: string } | null;
}

const PLANS: {
  id: Plan;
  label: string;
  price: string;
  description: string;
  badge: string | null;
  per: string;
}[] = [
  {
    id: "annual",
    label: "Annual",
    price: "£79",
    description: "Save £16.9, billed yearly.",
    badge: "BEST VALUE",
    per: "/ year",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "£7.99",
    description: "Billed monthly.",
    badge: null,
    per: "/ month",
  },
];

const FEATURES = [
  {
    icon: FaBookOpen,
    title: "The full premium library",
    subtitle: "10,000+ curated carefully by experts.",
  },
  {
    icon: HiSparkles,
    title: "Personalized nutrient guidance",
    subtitle: "Tailored to you and your concerns",
  },
  {
    icon: FaBookmark,
    title: "Keep your remedies closed",
    subtitle: "Save your remedies for whenever you need them",
  },
  {
    icon: FaHeart,
    title: "Community insights",
    subtitle: "Real time reviews from users",
  },
];

const PLAN_LABELS: Record<
  Plan,
  { name: string; price: string; description: string }
> = {
  annual: {
    name: "Nuko+ (Annual)",
    price: "£79",
    description: "Save £16.9, billed yearly.",
  },
  monthly: {
    name: "Nuko+ (Monthly)",
    price: "£7.99",
    description: "Billed monthly.",
  },
};

export function CheckoutFlow({ user }: CheckoutFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [email, setEmail] = useState(user?.email ?? "");
  const [otpCode, setOtpCode] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP tokens are single-use; guard against verifyOtp being fired twice for
  // the same code (e.g. autofill auto-submit racing a manual tap), which
  // would otherwise surface a stray "Invalid or expired code" error on the
  // payment step — and that step renders the error *instead of* the embed.
  const verifyInFlightRef = useRef(false);

  // ── Payment step: fetch a Stripe session for the selected plan ──────────
  useEffect(() => {
    if (step === "payment" && !clientSecret) {
      fetchClientSecretForPlan(selectedPlan)
        .then((result) => {
          if ("error" in result) setError(result.error);
          else setClientSecret(result.clientSecret);
        })
        .catch(() => setError("Failed to start payment. Please try again."));
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step: plan selection ─────────────────────────────────────────────────
  const handleContinueFromPlan = () => {
    setError(null);
    setStep(user ? "payment" : "email");
  };

  // ── Step: email submit (guests only) ─────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await initiateCheckout(email);

      if ("error" in result) {
        setError(result.error);
        return;
      }

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

  // ── Step: OTP verify (guests only) ───────────────────────────────────────
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    if (verifyInFlightRef.current) return;
    verifyInFlightRef.current = true;
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
      verifyInFlightRef.current = false;
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

  const handlePaymentBack = () => {
    setError(null);
    setClientSecret(null);
    setStep(user ? "plan" : "otp");
  };

  const planInfo = PLAN_LABELS[selectedPlan];

  return (
    <div className="min-h-dvh bg-background pb-10">
      {/* ── Step: plan selection ── */}
      {step === "plan" && (
        <>
          <div className="flex justify-end px-4 pt-5 pb-6">
            <button
              onClick={() => router.push("/")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="px-4 flex flex-col gap-[40px]">
            <div className="flex flex-col gap-3 items-center">
              <p className="font-semibold text-2xl">Get full access</p>
              <p className="lateef-bold font-semibold text-[40px] leading-10 text-center w-74.5">
                Your body deserves the{" "}
                <span className="text-[#227B6F] lateef-bold">
                  VIP treatment
                </span>
              </p>
              <Image src={image} alt="image" width={150} height={76} />
            </div>

            {/* Feature list */}
            <div className="relative grid grid-cols-2 bg-[#ECECE1] rounded-3xl p-6">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex flex-col items-center text-center gap-3 px-4 py-6"
                  >
                    <Icon
                      className="size-6"
                      style={{ color: "var(--mint-green)" }}
                    />
                    <div className="space-y-1">
                      <p className="font-semibold text-[#103E2A] text-sm">
                        {f.title}
                      </p>
                      <p className="font-medium text-xs">{f.subtitle}</p>
                    </div>
                  </div>
                );
              })}

              {/* Horizontal divider: one continuous line across the middle */}
              <div className="pointer-events-none absolute top-1/2 left-6 right-6 -translate-y-1/2 h-px bg-[#D8D8CC]" />

              {/* Vertical divider, top segment: stops 6px above the horizontal line */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-6 bottom-[calc(50%+6px)] w-px bg-[#D8D8CC]" />

              {/* Vertical divider, bottom segment: starts 6px below the horizontal line */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[calc(50%+6px)] bottom-6 w-px bg-[#D8D8CC]" />
            </div>

            {/* Plan options */}
            <div className="space-y-3 pt-2">
              {PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <div className="relative" key={plan.id}>
                    {plan.badge && (
                      <span
                        className="text-xs font-semibold px-3 z-0 py-1 pb-3.5 rounded-t-md text-white absolute -top-5 left-0"
                        style={{ backgroundColor: "var(--mint-green)" }}
                      >
                        {plan.badge}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full z-10 relative text-left rounded-2xl p-4 border-2 bg-card transition-all ${
                        isSelected ? "border-mint-green" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-mint-green" : "border-border"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-mint-green" />
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {plan.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {plan.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col">
                          <span className="text-2xl font-bold text-foreground">
                            {plan.price}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {plan.per}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Continue */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleContinueFromPlan}
                className="w-full flex items-center justify-center py-4 rounded-full text-white font-semibold text-base hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "var(--mint-green)" }}
              >
                Continue
              </button>
              <div className="flex items-center justify-center text-sm text-subtle gap-2">
                <FilledLock /> <span>Secure checkout • Cancel anytime</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Step: email (guests only) ── */}
      {step === "email" && (
        <>
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <button
              onClick={() => setStep("plan")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="flex flex-col items-center px-6 pt-6">
            <div className="mb-8">
              <NuraLogo size="lg" variant="full" />
            </div>

            <div className="w-full max-w-sm space-y-4">
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
                  className="w-full flex items-center justify-center text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "var(--mint-green)" }}
                >
                  {isLoading ? "Sending code..." : "Continue →"}
                </button>
              </form>

              <p className="text-center text-xs text-muted-foreground pt-2">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="text-foreground hover:underline"
                >
                  Sign in →
                </button>
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Step: OTP (guests only) ── */}
      {step === "otp" && (
        <>
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <button
              onClick={() => setStep("email")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
            <button
              onClick={() => router.push("/")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="flex flex-col items-center px-6 pt-6">
            <div className="mb-8">
              <NuraLogo size="lg" variant="full" />
            </div>

            <div className="w-full max-w-sm space-y-4">
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
                  className="w-full flex items-center justify-center text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "var(--mint-green)" }}
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
            </div>
          </div>
        </>
      )}

      {/* ── Step: payment ── */}
      {step === "payment" && (
        <>
          <div className="flex items-center justify-between px-4 pt-5 pb-4 mb-7">
            <button
              onClick={handlePaymentBack}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Back"
            >
              <ArrowLeft className="size-5 text-foreground" />
            </button>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">
                Continue payment
              </p>
              <p className="text-sm text-muted-foreground">Welcome back</p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
              aria-label="Close"
            >
              <X className="size-5 text-foreground" />
            </button>
          </div>

          <div className="px-4 space-y-4">
            {/* Plan summary */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl border"
              style={{
                borderColor: "var(--mint-green)",
                backgroundColor: "#E6F4EC",
              }}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {planInfo.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {planInfo.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">
                  {planInfo.price}
                </p>
                <p className="text-xs text-muted-foreground">/ month</p>
              </div>
            </div>

            {/* Stripe checkout */}
            {error ? (
              <p className="text-sm text-red-500 text-center">{error}</p>
            ) : !clientSecret ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
              </div>
            ) : (
              <CheckoutEmbed clientSecret={clientSecret} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
