import { createClient } from "@/lib/supabase/server";

import RequestForm from "@/components/feature-request/RequestForm";

const page = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <RequestForm
      email={user?.email || ""}
      fullname={user.user_metadata.full_name || ""}
    />
  );
};

export default page;
