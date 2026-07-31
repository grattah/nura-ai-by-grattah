"use client";
import { useState } from "react";
import { PaywallModal } from "@/components/paywall/paywall-modal";

export function RecipePaywallGate() {
  const [open, setOpen] = useState(true);
  return <PaywallModal open={open} onOpenChange={setOpen} />;
}