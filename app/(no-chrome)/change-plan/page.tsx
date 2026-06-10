import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePlanClient } from "./change-plan-client";

export default async function ChangePlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return <ChangePlanClient />;
}
