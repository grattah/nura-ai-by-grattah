"use client";

import { useState } from "react";
import FreeTokens from "@/components/tokens/FreeTokens";

export function FreeTokensModal() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return <FreeTokens onClose={() => setOpen(false)} />;
}