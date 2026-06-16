"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface OutOfCreditsModalProps {
  open: boolean;
  onClose: () => void;
  balance: number;
}

export function OutOfCreditsModal({
  open,
  onClose,
  balance,
}: OutOfCreditsModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="p-6 space-y-5">
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-5 gap-0">
            <div className="p-3 rounded-full bg-mint-green w-min mb-5">
              <Zap size={20} color="#FFFFFF" />
            </div>
            <div className="space-y-3">
              <DialogTitle className="text-2xl font-semibold text-black mb-3">
                You&apos;re out of credits
              </DialogTitle>
              <p className="text-subtle">
                You have {balance} credit{balance === 1 ? "" : "s"} left. Top up
                to keep going, or come back tomorrow — your daily credits refresh
                and any leftover credits always carry over.
              </p>
            </div>
          </DialogHeader>

          <button
            className="w-full py-4 rounded-4xl bg-[#227B6F] text-[#FFFFFF] font-medium"
            onClick={() => {
              onClose();
              router.push("/buy-credits");
            }}
          >
            Buy more credits
          </button>

          <button
            className="w-full text-center text-sm text-[#57605E] font-medium"
            onClick={onClose}
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
