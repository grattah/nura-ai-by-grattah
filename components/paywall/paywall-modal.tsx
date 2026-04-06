"use client";

import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { fetchClientSecret } from "@/app/actions/stripe";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const [showCheckout, setShowCheckout] = useState(false);

  const handleClose = (val: boolean) => {
    if (!val) setShowCheckout(false); // reset to pitch step on close
    onOpenChange(val);
  };

  const fetchSecret = useCallback(async () => {
    const clientSecret = await fetchClientSecret();
    if (!clientSecret) throw new Error("Stripe client secret is required");
    return clientSecret;
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {!showCheckout ? (
          <div className="p-6 space-y-5">
            <DialogHeader className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Unlock Full Access
              </DialogTitle>
            </DialogHeader>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Full recipes with ingredients & steps",
                "Why it works & inside chef tips",
                "AI-powered follow-up Q&A",
                "Cancer risk guides & personalised advice",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-foreground">£79</p>
              <p className="text-sm text-muted-foreground">
                per year · cancel anytime
              </p>
            </div>

            <Button className="w-full" onClick={() => setShowCheckout(true)}>
              Get full access
            </Button>

            <div className="text-center space-y-1">
              <Link
                href="/restore"
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Already paid? Restore access →
              </Link>
              <Link
                href="/auth"
                className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Have an account? Sign in →
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret: fetchSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
