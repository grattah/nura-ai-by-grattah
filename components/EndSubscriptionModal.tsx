"use client";

import React from "react";
import Image from "next/image";

const EndSubscriptionModal = ({ onClose }: { onClose?: () => void }) => {
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute h-dvh inset-0 bg-white/20 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-95.5 px-6 pt-10 pb-8 bg-white rounded-2xl flex flex-col gap-8 items-center text-center">
        <Image
          src="/endSubscription.svg"
          alt="end-subscription-image"
          width={150}
          height={76}
          className="w-37.5 h-19"
        />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-title font-semibold text-base-text leading-[100%]">
              We’re devastated
            </p>
            <p className="text-base text-subtle">
              Your subscription has been cancelled. You'll keep your access to
              Nuko+ features until the end of your billing cycle.
            </p>
          </div>
          <button
            className="py-4 font-medium text-base text-white rounded-full bg-mint-green"
            onClick={onClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndSubscriptionModal;
