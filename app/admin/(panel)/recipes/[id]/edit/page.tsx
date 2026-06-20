import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { canEdit, canApprove } from "@/lib/admin/roles";
import { RecipeForm } from "@/components/admin/recipe-form";
import BackButton from "@/components/back-button";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await getAdminIdentity();
  if (!identity || !canEdit(identity.role)) redirect("/admin/recipes");

  const admin = createServiceRoleClient();
  const [{ data: recipe }, { data: tags }] = await Promise.all([
    admin
      .from("recipes")
      .select("*, recipe_tags(tag_id)")
      .eq("id", id)
      .maybeSingle(),
    admin.from("tags").select("id, name").order("display_order"),
  ]);

  if (!recipe) return notFound();

  const r = recipe as Record<string, unknown> & {
    recipe_tags?: { tag_id: string }[];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-x-3">
        <BackButton />
        <h1 className="text-2xl font-semibold text-foreground">Edit recipe</h1>
      </div>
      <RecipeForm
        tags={tags ?? []}
        canSetStatus={canApprove(identity.role)}
        initial={{
          id,
          title: (r.title as string) ?? "",
          short_description: (r.short_description as string) ?? "",
          recipe_section_title: (r.recipe_section_title as string) ?? "",
          why_it_works: (r.why_it_works as string) ?? "",
          inside_tip: (r.inside_tip as string) ?? "",
          source_url: (r.source_url as string) ?? "",
          display_order: (r.display_order as number) ?? null,
          is_todays_recipe: (r.is_todays_recipe as boolean) ?? false,
          status: ((r.status as string) ?? "approved") as
            | "pending"
            | "approved",
          drink_type: ((r.drink_type as string) ?? "drinks") as never,
          image_url: (r.image_url as string | null) ?? null,
          ingredients:
            (r.ingredients as { emoji: string; label: string }[]) ?? [],
          how_to_make:
            (r.how_to_make as { step: string; instruction: string }[]) ?? [],
          preview_ingredients: (r.preview_ingredients as string[]) ?? [],
          follow_up_questions: (r.follow_up_questions as string[]) ?? [],
          tagIds: (r.recipe_tags ?? []).map((rt) => rt.tag_id),
        }}
      />
    </div>
  );
}
