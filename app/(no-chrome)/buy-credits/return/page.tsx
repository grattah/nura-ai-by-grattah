import { Suspense } from "react";
import { BuyCreditsReturnClient } from "./return-client";

export default function BuyCreditsReturnPage() {
  return (
    <Suspense fallback={<ReturnFallback />}>
      <BuyCreditsReturnClient />
    </Suspense>
  );
}

function ReturnFallback() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background gap-3">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-muted-foreground text-sm">Confirming your credits…</p>
    </div>
  );
}
