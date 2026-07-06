// components/auth/SignInModalGate.tsx
"use client";

import { useState } from "react";
import { SignInModal } from "@/components/auth/SignInModal";

export function SignInModalGate() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return <SignInModal onClose={() => setOpen(false)} />;
}