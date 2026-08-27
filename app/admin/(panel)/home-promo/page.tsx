import { getHomePromoForAdmin } from "@/actions/admin-home-promo";
import { getAdminIdentity } from "@/lib/admin/auth";
import { canEdit } from "@/lib/admin/roles";
import { HomePromoForm } from "@/components/admin/home-promo-form";

export const dynamic = "force-dynamic";

export default async function HomePromoPage() {
  const [result, identity] = await Promise.all([
    getHomePromoForAdmin(),
    getAdminIdentity(),
  ]);

  if ("error" in result) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Homepage card</h1>
        <p className="mt-4 text-sm text-[#DC2323]">{result.error}</p>
      </div>
    );
  }

  const { promo, recipeTitle } = result;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Homepage card</h1>
        <p className="mt-1 text-sm text-subtle">
          The prompt card shown on the homepage to members with a health
          profile. Changes appear immediately.
        </p>
      </div>

      <HomePromoForm
        initialBody={promo.body}
        initialRecipeId={promo.recipeId}
        initialRecipeTitle={recipeTitle}
        canEdit={!!identity && canEdit(identity.role)}
      />

      {promo.updatedAt && (
        <p className="mt-8 text-xs text-subtle">
          Last updated{" "}
          {new Date(promo.updatedAt).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
    </div>
  );
}
