import { Recipe } from "@/lib/types";
import { Card, CardContent } from "@/ui/card";
import Image from "next/image";
import Link from "next/link";

export function RecipeCard({
  recipe,
  priority,
}: {
  recipe: Recipe;
  priority?: boolean;
}) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card hover:opacity-90 active:scale-[0.97] transition-all duration-150">
        <div className="w-full bg-muted" style={{ aspectRatio: "4/3" }}>
          {recipe.image_url && (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 260px"
              className="object-cover"
              priority={priority}
            />
          )}
        </div>
        <CardContent className="px-4 py-3">
          <p className="text-sm font-bold text-foreground mb-2 leading-snug truncate">
            {recipe.title}
          </p>
          {/* <ul className="space-y-1">
            {recipe.previewIngredients.slice(0, 3).map((ing, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-muted-foreground leading-snug"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
                {ing}
              </li>
            ))}
          </ul> */}
        </CardContent>
      </Card>
    </Link>
  );
}
