import { getCloudinaryUrl } from "@/lib/cloudinary";
import { Recipe } from "@/lib/types";
import { Card, CardContent } from "@/ui/card";
import Image from "next/image";
import Link from "next/link";

export function SearchRecipeCard({
  recipe,
  priority,
  personalizedScore,
}: {
  recipe: Pick<Recipe, "id" | "title" | "image_url">;
  priority?: boolean;
  personalizedScore: number;
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

        <div className="flex justify-between items-center">
          <p
            className={`font-medium text-xs py-0.5 px-1.5 rounded-sm tracking-[0.02em] ${
              personalizedScore >= 60
                ? "bg-[#E3E8D7] text-success-c600"
                : "bg-[#EEE0CA] text-warning-c600"
            }`}
          >
            {personalizedScore >= 60 ? "Strong match" : "Moderate match"}
          </p>
          <p
            className={`text-sm ${
              personalizedScore >= 60 ? "text-mint-green" : "text-warning-c600"
            }`}
          >
            {personalizedScore}%
          </p>
        </div>
      </div>
    </Link>
  );
}
