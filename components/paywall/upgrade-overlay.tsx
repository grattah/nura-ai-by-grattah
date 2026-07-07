"use client";

import { PersonalizedSearchSkeleton } from "@/components/paywall/personalized-search-skeleton";
import { FilledLock2 } from "../vectors/filled-lock";

interface UpgradeOverlayProps {
  /** Opens the Get Nuko+ modal when the lock is tapped. */
  onUpgrade: () => void;
}

export function UpgradeOverlay({ onUpgrade }: UpgradeOverlayProps) {
  return (
    <div className="relative min-h-dvh bg-background overflow-hidden">
      <PersonalizedSearchSkeleton />

      {/* Lock overlay — tapping opens the Get Nuko+ modal. */}
      <button
        type="button"
        onClick={onUpgrade}
        aria-label="Upgrade to Nuko+"
        className="absolute inset-0 z-10 flex items-center justify-center px-8"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="size-12 rounded-full p-3 bg-white">
            <FilledLock2 />
          </div>
          <span className="text-xl font-semibold text-mint-green">
            Upgrade to Nuko+
          </span>
        </div>
      </button>
    </div>
  );
}
