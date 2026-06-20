import React from "react";
import SuccessAnimation from "./SuccessAnimation";

const SuccessModal = ({
  message,
  subtitle,
  onClose,
}: {
  message: string;
  subtitle: string;
  onClose: () => void;
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      {/* Backdrop: dims and blurs everything behind the modal */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card: sits above the backdrop. stopPropagation so clicking the
          card doesn't trigger the overlay's onClose. */}
      <div
        className="relative bg-white py-8 px-6 rounded-2xl flex flex-col gap-5 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center items-center text-center">
          <SuccessAnimation />
        </div>
        <div className="flex flex-col gap-3 justify-center items-center">
          <p className="text-2xl font-semibold text-center">{message}</p>
          <p className="text-center text-base text-subtle">{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-4 bg-mint-green text-white rounded-full"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;
