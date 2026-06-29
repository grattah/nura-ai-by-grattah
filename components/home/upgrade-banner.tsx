"use client";
import Image from "next/image";
import { useState } from "react";
import { PaywallModal } from "../paywall/paywall-modal";

interface UpgradeBannerProps {
  hasAccess: boolean;
}

export function UpgradeBanner({ hasAccess }: UpgradeBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  if (hasAccess) {
    return;
  }

  return (
    <>
      <button onClick={() => setModalOpen(true)} className="block text-left">
        <div className="bg-green/12 rounded-2xl pr-3 flex gap-5 items-center relative h-29">
          <div className="shrink-0 flex items-center justify-center bg-no-repeat bg-[url('/shape-set.png')] w-22 h-29 absolute left-0 inset-y-0 rounded-l-2xl">
            <Image src="/3davatar.png" alt="3D Avatar" width={64} height={64} />
          </div>
          <div className="flex-1 space-y-2 ml-25">
            <p className="font-semibold text-base-text text-lg">
              Unlock every recipe
            </p>
            <p className="text-base text-grey-c700 leading-snug">
              Full methods, ingredients, personalized feedbacks, and daily
              reminders. All for{" "}
              <span className="text-base-text font-medium">$7 monthly!</span>
            </p>
          </div>
        </div>
      </button>
      <PaywallModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
