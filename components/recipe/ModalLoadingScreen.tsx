import React from "react";
import Image from "next/image";
import loader from "@/public/loader.png";

interface ModalLoadingScreenProps {
  message?: string;
}

export default function ModalLoadingScreen({
  message = "Fetching more suggestions...",
}: ModalLoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
      <div
        className="bg-white rounded-2xl px-8 py-8 flex flex-col items-center gap-3 max-w-xs w-full"
        role="status"
        aria-live="polite"
      >
        <Image
          src={loader}
          alt=""
          width={32}
          height={32}
          className="animate-spin"
        />
        <p className="text-sm text-[#1B1D1D] font-medium">{message}</p>
      </div>
    </div>
  );
}
