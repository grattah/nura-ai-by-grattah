import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContinuePaymentClient } from "./continue-payment-client";

export default async function ContinuePaymentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <ContinuePaymentClient />;
}
