"use client";

import { useAccess } from "@/hooks/use-access";

export function AddToHomescreenButton() {
  const { isSubscriber } = useAccess();

  if (!isSubscriber) return null;

  return (
    <button
      onClick={() => window.dispatchEvent(new Event("nuko:show-install-prompt"))}
      className="mt-11 underline font-semibold text-base text-mint-green text-center w-full flex justify-center items-center"
    >
      Add the app to your homescreen
    </button>
  );
}
