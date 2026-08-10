"use client"

import React from "react";
import Image from "next/image";

import SuccessAnimation from "./SuccessAnimation";

const SubscribeModal = ({ onClose }: { onClose?: () => void }) => {
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
        <div className="flex justify-center items-center text-center">
          <SuccessAnimation />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-title font-semibold text-base-text leading-[100%]">
              Welcome to{" "}<span className="text-mint-green">Nuko+</span>
            </p>
            <p className="text-base text-subtle">
              You now have access to the full recipes and methods and recommendations
            </p>
          </div>
          <button
            className="py-4 font-medium text-base text-white rounded-full bg-mint-green"
            onClick={onClose}
          >
            Continue exploring
          </button>
        </div>
      </div>
    </div>  
  )
}

export default SubscribeModal;
