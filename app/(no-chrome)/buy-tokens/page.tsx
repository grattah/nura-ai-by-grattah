import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/subscription";
import BuyTokens from "@/components/tokens/BuyTokens";

const page = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await hasActiveSubscription(supabase, user.id))) {
    redirect("/tokens");
  }

  return <BuyTokens />;
};

export default page;
