import { redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { canCreate, canApprove } from "@/lib/admin/roles";
import { RecipeForm } from "@/components/admin/recipe-form";
import BackButton from "@/components/back-button";

export default async function NewRecipePage() {
  const identity = await getAdminIdentity();
  if (!identity || !canCreate(identity.role)) redirect("/admin/recipes");

  const admin = createServiceRoleClient();
  const { data: tags } = await admin
    .from("tags")
    .select("id, name")
    .order("display_order");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-x-3">
        <BackButton />
        <h1 className="text-2xl font-semibold text-foreground">New recipe</h1>
      </div>
      <RecipeForm tags={tags ?? []} canSetStatus={canApprove(identity.role)} />
    </div>
  );
}
