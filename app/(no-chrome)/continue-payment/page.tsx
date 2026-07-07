import { createClient } from "@/lib/supabase/server";
import { ContinuePaymentClient } from "./continue-payment-client";

export default async function ContinuePaymentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guests: land here and get the sign-in overlay from RouteAuthGuard.
  if (!user) return null;

  return <ContinuePaymentClient />;
}
