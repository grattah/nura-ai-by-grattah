import React from "react";
import { createClient } from "@/lib/supabase/server";

import HelpForm from "@/components/help-and-guidance/HelpForm";

const page = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // guest → RouteAuthGuard sign-in overlay

  return <HelpForm email={user?.email || ""} fullname={user.user_metadata.full_name || ""} />;
};

export default page;
