"use client";

import { useState } from "react";
import { useAccess } from "@/hooks/use-access";
import { useToast } from "@/hooks/use-toast";
import { PaywallModal } from "@/components/paywall/paywall-modal";

export function CompleteHealthProfileButton() {
  const { isSubscriber, isLoading } = useAccess();
  const { toast } = useToast();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handleClick = () => {
    if (isLoading) return;

    if (!isSubscriber) {
      setPaywallOpen(true);
      return;
    }

    // TODO: navigate to the health-profile page once it exists.
    toast({
      title: "Coming soon",
      description: "Personalized health profiles are almost ready.",
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm text-base-text py-2 pr-3 pl-2 bg-[#F3F1E8] rounded-full self-end w-fit font-medium leading-none hover:opacity-75 transition-opacity"
      >
        Complete health profile →
      </button>
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  );
}
