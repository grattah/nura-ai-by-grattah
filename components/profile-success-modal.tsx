"use client";

import React from "react";
import SuccessAnimation from "./SuccessAnimation";

const ProfileSuccessModal = ({
  onClose,
  onSeeRecommendations,
}: {
  onClose?: () => void;
  onSeeRecommendations?: () => void;
}) => {
  return (
    <div className="fixed inset-0 h-dvh z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute h-dvh inset-0 bg-black/20 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-95.5 bg-white rounded-2xl px-6 py-8 flex flex-col items-center text-center">
        <div className="flex justify-center items-center text-center">
          <SuccessAnimation />
        </div>

        <div className="flex flex-col gap-3 items-center mt-4 mb-5">
          <p className="font-semibold text-title text-base-text leading-[100%]">
            Congratulations!
          </p>
          <p className="text-base text-subtle">Your match is ready.</p>
        </div>

        <button
          onClick={onSeeRecommendations ?? onClose}
          className="w-full py-3 rounded-full bg-mint-green text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          See your recommendations
        </button>
      </div>
    </div>
  );
};

export default ProfileSuccessModal;
