import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { canManageMembers } from "@/lib/admin/roles";
import { MembersManager, type Member } from "@/components/admin/members-manager";

export default async function MembersPage() {
  const identity = await getAdminIdentity();
  if (!identity || !canManageMembers(identity.role)) redirect("/admin");

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("admin_members" as never)
    .select("user_id, role, email, created_at")
    .order("created_at", { ascending: true });

  const members = (data ?? []) as unknown as Member[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Members</h1>
      <MembersManager
        members={members}
        currentUserId={identity.userId}
      />
    </div>
  );
}
