import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { CheckoutFlow } from "@/components/checkout-flow";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already subscribed, no need to be here
  if (user && (await hasActiveSubscription(supabase, user.id))) {
    redirect("/");
  }

  return (
    <CheckoutFlow
      user={user ? { id: user.id, email: user.email ?? "" } : null}
    />
  );
}
