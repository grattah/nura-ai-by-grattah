import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuyCreditsFlow } from "@/components/credits/buy-credits-flow";

export default async function BuyCreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Buying credits requires an account (the balance is keyed to the user).
  if (!user) redirect("/auth/login?next=/buy-credits");

  return <BuyCreditsFlow />;
}
