"use client";

import { Mail, ShieldCheck, X } from "lucide-react";

interface ConfirmEmailModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmEmailModal({
  email,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ConfirmEmailModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-email-title"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 pt-16"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full bg-[#E8E6DC] hover:bg-[#D8D6CC] transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 rounded-full bg-mint-green mb-2">
            <ShieldCheck color="#FFFFFF" size={24} />
          </div>

          <h2 id="confirm-email-title" className="text-xl font-semibold">
            Confirm email
          </h2>

          <p className="text-sm text-[#57605E]">
            Please confirm carefully that this is your registered email address.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-grey-c100 p-4 flex items-start gap-3">
          <Mail size={20} className="text-mint-green mt-0.5 shrink-0" />
          <div className="flex flex-col">
            <p className="font-medium text-[#1A1A1A] break-all text-xs">
              {email}
            </p>
            <p className="text-xs text-[#57605E] mt-1">
              We will be sending a recovery link here
            </p>
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="mt-6 w-full bg-mint-green text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {isLoading ? "Sending..." : "Confirm email"}
        </button>
      </div>
    </div>
  );
}
