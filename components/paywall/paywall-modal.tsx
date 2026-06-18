"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, LockKeyhole, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const router = useRouter();

  const handleClose = (val: boolean) => {
    onOpenChange(val);
  };

  const benefits = [
    {
      title: "See the highest-scoring recipes",
      subtitle: "Based on your needs",
    },
    {
      title: "10,000+ wellness recipes",
      subtitle: "with expert tips",
    },
    {
      title: "Personalized nutrient guidance",
      subtitle: "Tailored to you",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="p-6 max-[400px]:p-4 space-y-5 max-[400px]:space-y-4">
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-5 max-[400px]:space-y-3 gap-0">
            <div className="p-3 rounded-full bg-mint-green w-min mb-5">
              <LockKeyhole size={20} color="#FFFFFF" />
            </div>
            <div className="space-y-3">
              <DialogTitle className="text-2xl max-[350px]:text-xl font-semibold text-black mb-3">
                A premium remedy
              </DialogTitle>
              <p className="text-subtle max-[350px]:text-sm">
                Unlock the full method, ingredients and gain full access to all
                Nuko’s recipes
              </p>
            </div>
          </DialogHeader>

          <ul className="rounded-2xl bg-grey-c100 py-4 max-[400px]:py-2 px-3 space-y-3">
            {benefits.map((item) => (
              <li key={item.title} className="flex items-center gap-3">
                <Check
                  size={16}
                  className="text-mint-green shrink-0 mt-0.5"
                  strokeWidth={1.5}
                />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-base-text text-sm leading-5">
                    {item.title}
                  </p>
                  <p className="text-sm text-subtle font-medium">
                    {item.subtitle}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-[#F2F3F3] p-4 max-[350px]:p-3">
            <p className="text-sm font-medium text-[#57605E]">Monthly</p>
            <p className="mt-1">
              <span className="text-xl max-[350px]:text-lg font-semibold text-[#1A1A1A]">
                £7.99
              </span>
              <span className="text-sm text-[#57605E]"> / month</span>
            </p>
          </div>

          <button
            className="w-full py-4 max-[350px]:py-3 rounded-4xl bg-[#227B6F] text-[#FFFFFF] font-medium"
            onClick={() => {
              onOpenChange(false);
              router.push("/checkout");
            }}
          >
            Get full access
          </button>

          <div className="text-center space-y-1">
            <Link
              href="/auth/login"
              className="block text-xs text-[#57605E]"
              onClick={() => onOpenChange(false)}
            >
              Have an account?{" "}
              <span className="font-semibold text-[#227B6F]">Sign in</span>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
