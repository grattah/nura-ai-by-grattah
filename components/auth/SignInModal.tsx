"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";

import avatar from "@/public/signInModal.png";

export function SignInModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/20 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-70 h-66.25 bg-white rounded-3xl px-6 pt-4 pb-6 flex flex-col items-center text-center">
        <div className="absolute top-2 right-2.5">
          <button
            onClick={onClose}
            className="size-7.5 rounded-full bg-grey-c100 flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Close"
          >
            <X className="size-4.5 text-foreground" />
          </button>
        </div>

        <Image src={avatar} alt="image" width={77} height={70} />

        <div className="flex flex-col gap-2 items-center mt-4.25 mb-3.5">
          <p className="font-semibold text-modaltitle text-black leading-6 lateef-bold max-w-49.25">
            Sign in to continue using the app
          </p>
          <p className="text-xs text-subtle">
            Please sign in to access expert recipes, favorites and personalised
            guidance.
          </p>
        </div>

        <button
          onClick={() => router.push("/auth/login")}
          className="w-full py-3 rounded-full bg-mint-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
