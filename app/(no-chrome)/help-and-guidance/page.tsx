import { createClient } from "@/lib/supabase/server";

import HelpForm from "@/components/help-and-guidance/HelpForm";

const page = async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <HelpForm
      email={user?.email ?? ""}
      fullName={user ? user.user_metadata.full_name : ""}
    />
  );
};

export default page;
