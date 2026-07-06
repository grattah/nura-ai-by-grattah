"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface UpgradeOverlayProps {
  /** Where the CTA sends the user; defaults to the annual plan checkout. */
  plan?: "annual" | "monthly";
}

/**
 * Full-screen "Upgrade to Nuko+" lock screen shown to lapsed subscribers (old
 * users) who no longer have access to personalized-search. Renders a blurred
 * mock of the wellness-support page behind a centered lock card — brand-new
 * users get the PaywallModal instead (with the "free trial has ended" badge).
 */
export function UpgradeOverlay({ plan = "annual" }: UpgradeOverlayProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Blurred, inert mock of the wellness-support layout behind the lock. */}
      <div
        aria-hidden
        className="pointer-events-none select-none blur-[6px] opacity-60"
      >
        <div className="px-6 pt-5 pb-4 text-center space-y-1.75">
          <p className="text-xl font-semibold text-base-text leading-none">
            Wellness support 🌿
          </p>
          <p className="text-sm text-subtle font-medium leading-none">
            Personalized for you
          </p>
        </div>
        <div className="px-6 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-[#E3E1D880] h-16" />
          <div className="bg-white rounded-2xl border border-[#E3E1D880] p-4 h-28" />
          <div className="bg-success-c100 rounded-2xl border border-[#C4CAC8] p-4 h-24" />
          <div className="bg-white rounded-2xl border border-grey-c100 h-40" />
          <div className="bg-white rounded-2xl border border-[#E3E1D880] p-4 h-24" />
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-5 left-6 z-10 size-10 bg-badge rounded-full flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity"
        aria-label="Go back"
      >
        <ArrowLeft className="size-5 text-grey-c900" />
      </button>

      {/* Lock card */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-8">
        <div className="w-full max-w-sm rounded-3xl bg-white px-8 py-10 flex flex-col items-center text-center gap-5 shadow-xl">
          <div className="size-16 rounded-full bg-linear-to-b from-[#F3EBD3] to-[#F8F5EE] flex items-center justify-center">
            <Lock size={28} className="text-mint-green" strokeWidth={2} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-base-text">
              Upgrade to Nuko+
            </h2>
            <p className="text-subtle text-sm max-w-xs">
              Unlock personalized wellness guidance tailored to your concerns,
              plus the full premium library.
            </p>
          </div>

          <Image alt="nuko+" src="/planImage.webp" width={130} height={66} />

          <button
            onClick={() => router.push(`/checkout?plan=${plan}`)}
            className="w-full py-4 rounded-4xl bg-[#227B6F] text-white font-medium transition-transform active:scale-[0.98]"
          >
            Upgrade to Nuko+
          </button>
        </div>
      </div>
    </div>
  );
}
