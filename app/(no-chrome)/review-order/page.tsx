import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewOrderClient } from "./review-order-client";

export default async function ReviewOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <ReviewOrderClient />;
}
