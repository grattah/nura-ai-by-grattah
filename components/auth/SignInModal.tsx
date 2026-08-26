"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

import SignInModalImage from "../vectors/SignInModalImage";
import Link from "next/link";
import { lockAppScroll } from "@/lib/scroll-lock";
import { loginHrefWithNext } from "@/lib/navigation";

export function SignInModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  // Lock background scroll while the modal is open (it mounts only when open).
  useEffect(() => {
    return lockAppScroll();
  }, []);

  return (
    <div className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute h-dvh inset-0 bg-black/20 backdrop-blur-xs"
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

        <SignInModalImage />

        <div className="flex flex-col gap-2 items-center mt-4.25 mb-3.5">
          <p className="font-semibold text-modaltitle text-black leading-6 font-lateef max-w-49.25">
            Sign up to continue using the app
          </p>
          <p className="text-xs text-subtle">
            Please sign up to access expert recipes, favorites and personalised
            guidance.
          </p>
        </div>

        <button
          onClick={() => router.push("/landing")}
          className="w-full py-3 rounded-full bg-mint-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign up
        </button>
        <p className="text-xs text-subtle mt-2 text-center">
          Got an account?{" "}
          <Link
            href={loginHrefWithNext(pathname)}
            replace
            className="text-mint-green font-extrabold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
