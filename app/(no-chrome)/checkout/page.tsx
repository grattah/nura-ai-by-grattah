import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import { CheckoutFlow } from "@/components/checkout-flow";
import type { Plan } from "@/constants";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && (await hasActiveSubscription(supabase, user.id))) {
    redirect("/");
  }

  const raw = (await searchParams).plan;
  const plan: Plan =
    raw === "monthly" || raw === "weekly" ? raw : "annual";

  return (
    <CheckoutFlow
      user={user ? { id: user.id, email: user.email ?? "" } : null}
      plan={plan}
    />
  );
}
