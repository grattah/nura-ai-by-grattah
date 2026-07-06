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
      <div className="relative w-full max-w-70 bg-white rounded-3xl px-6 pt-4 pb-6 flex flex-col items-center text-center gap-3">
        <div className="absolute top-2 right-2">
          <button
            onClick={onClose}
            className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
            aria-label="Close"
          >
            <X className="size-5 text-foreground" />
          </button>
        </div>

        <Image src={avatar} alt="image" width={77} height={70} />

        <div className="flex flex-col gap-2 mt-1 items-center">
          <p className="font-semibold text-3xl text-[#111312] leading-7 lateef-bold">
            Sign in to continue using the app
          </p>
          <p className="text-xs text-subtle w-10/12">
            Please sign in to access expert recipes, favorites and personalised
            guidance.
          </p>
        </div>

        <button
          onClick={() => router.push("/auth/login")}
          className="w-full mt-2 py-3 rounded-full bg-mint-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
