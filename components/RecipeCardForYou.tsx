import { getCloudinaryUrl } from "@/lib/cloudinary";
import { Recipe } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

export function RecipeCardForYou({
  recipe,
  score,
  priority,
}: {
  recipe: Pick<Recipe, "id" | "title" | "image_url">;
  priority?: boolean;
  /** CategoryScore for the category being viewed (recipe_categories.score). */
  score?: number | null;
}) {
  const imageUrl = recipe.image_url
    ? getCloudinaryUrl(recipe.image_url, { width: 600, height: 450 })
    : undefined;
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <div className="border-0 space-y-3 hover:opacity-90 active:scale-[0.97] transition-all duration-150">
        <div className="w-full bg-grey-c100 relative rounded-2xl overflow-hidden aspect-square">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 430px) calc((100vw - 16px) / 2), 183px"
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
              priority={priority}
              unoptimized={!imageUrl.includes("/upload/")}
            />
          )}
        </div>

        <p className="text-sm font-medium text-subtle leading-snug truncate">
          {recipe.title}
        </p>
      </div>
      <p className="bg-[#E3E8D7] py-0.5 px-1.5 rounded-sm text-xs font-medium text-brand-c600 w-fit mt-1.5">
        {Math.round(score ?? 0)}% match
      </p>
    </Link>
  );
}
