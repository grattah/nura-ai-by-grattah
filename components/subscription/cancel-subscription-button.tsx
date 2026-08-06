"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  cancelSubscription,
  reactivateSubscription,
} from "@/actions/cancel-subscription";
import EndSubscriptionModal from "@/components/EndSubscriptionModal";

export function CancelSubscriptionButton({
  cancelAtPeriodEnd,
  accessUntil,
}: {
  cancelAtPeriodEnd: boolean;
  accessUntil: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showGoodbye, setShowGoodbye] = useState(false);
  const [pending, startTransition] = useTransition();

  const doCancel = () =>
    startTransition(async () => {
      const res = await cancelSubscription();
      if ("error" in res) {
        toast({
          title: "Couldn't cancel",
          description: res.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription cancelled",
          description: `You'll keep access until ${accessUntil}.`,
        });
        setOpen(false);
        setShowGoodbye(true);
      }
    });

  const doResume = () =>
    startTransition(async () => {
      const res = await reactivateSubscription();
      if ("error" in res) {
        toast({
          title: "Couldn't resume",
          description: res.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription resumed",
          description: "Your plan will renew as normal.",
        });
      }
    });

  return (
    <>
      {cancelAtPeriodEnd ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#FFF7EC] border border-[#F3912833] px-4 py-3">
            <p className="text-sm text-[#1B1D1D]">
              Your plan is set to cancel — you'll keep access until{" "}
              <span className="font-semibold">{accessUntil}</span>.
            </p>
          </div>
          <Button
            onClick={doResume}
            disabled={pending}
            className="w-full rounded-full bg-mint-green text-white hover:opacity-90 h-auto py-4"
          >
            {pending ? "Resuming…" : "Resume subscription"}
          </Button>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="w-full text-center text-sm font-semibold text-grey-c500 py-3 hover:opacity-75 transition-opacity">
              Cancel subscription
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Cancel subscription?</DialogTitle>
              <DialogDescription>
                You&apos;ll keep full access until {accessUntil}, after which
                your plan won&apos;t renew.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Keep plan
              </Button>
              <Button
                variant="destructive"
                onClick={doCancel}
                disabled={pending}
              >
                {pending ? "Cancelling…" : "Yes, cancel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {showGoodbye && (
        <EndSubscriptionModal onClose={() => setShowGoodbye(false)} />
      )}
    </>
  );
}
