"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { DELETION_GRACE_DAYS } from "@/lib/account-deletion";
import { lockAppScroll } from "@/lib/scroll-lock";

export function DeletionScheduledModal({ show }: { show: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(show);

  useEffect(() => {
    if (!open) return;
    return lockAppScroll();
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    router.replace("/");
  };

  return (
    <div
      className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deletion-scheduled-title"
    >
      <div className="absolute h-dvh inset-0 bg-black/20 backdrop-blur-xs" />

      <div className="relative w-full max-w-95.5 px-6 pt-10 pb-8 bg-white rounded-2xl flex flex-col gap-8 items-center text-center">
        <Image
          src="/endSubscription.svg"
          alt=""
          width={150}
          height={76}
          className="w-37.5 h-19"
        />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p
              id="deletion-scheduled-title"
              className="text-title font-semibold text-base-text leading-[100%]"
            >
              Scheduled for deletion
            </p>
            <p className="text-base text-subtle">
              Your account will be permanently deleted in {DELETION_GRACE_DAYS}{" "}
              days. Sign in anytime before then to cancel the deletion request.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="py-4 font-medium text-base text-white rounded-full bg-mint-green hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
