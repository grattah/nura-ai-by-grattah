import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutFlow } from "@/components/checkout-flow";

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already subscribed, no need to be here
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (sub) redirect("/");
  }

  return (
    <CheckoutFlow
      user={user ? { id: user.id, email: user.email ?? "" } : null}
    />
  );
}
