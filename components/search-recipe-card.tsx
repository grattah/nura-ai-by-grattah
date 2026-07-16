import { getCloudinaryUrl } from "@/lib/cloudinary";
import { Recipe } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { MatchBadge } from "@/components/match-badge";

export function SearchRecipeCard({
  recipe,
  priority,
  score,
}: {
  recipe: Pick<Recipe, "id" | "title" | "image_url">;
  priority?: boolean;
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
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 260px"
              className="object-cover"
              priority={priority}
              unoptimized={!imageUrl.includes("/upload/")}
            />
          )}
        </div>

        <p className="text-base font-medium text-grey-c950 mb-1 leading-snug truncate josefin-sans">
          {recipe.title}
        </p>

        <MatchBadge score={score} />
      </div>
    </Link>
  );
}
