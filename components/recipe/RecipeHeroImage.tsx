"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { RECIPE_IMAGE_GENERATION_ENABLED } from "@/lib/recipe-visibility";

export function RecipeHeroImage({
  recipeId,
  title,
  initialImageUrl,
}: {
  recipeId: string;
  title: string;
  initialImageUrl: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [failed, setFailed] = useState(!RECIPE_IMAGE_GENERATION_ENABLED);
  const triggered = useRef(false);

  useEffect(() => {
    if (imageUrl || triggered.current || !RECIPE_IMAGE_GENERATION_ENABLED) return;
    triggered.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/recipes/${recipeId}/image`, {
          method: "POST",
        });
        if (!res.ok) throw new Error("image request failed");
        const data = await res.json();
        if (data?.imageUrl) setImageUrl(data.imageUrl);
        else setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, [recipeId, imageUrl]);

  const src = imageUrl
    ? getCloudinaryUrl(imageUrl, { width: 900, height: 506 })
    : undefined;

  return (
    <div className="mx-6 rounded-4xl overflow-hidden bg-muted mb-8 relative aspect-video">
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          sizes="calc(100vw - 32px)"
          className="object-cover"
          priority
          // Serve Supabase images unoptimized; the Next optimizer times out on them.
          unoptimized={!src.includes("/upload/")}
        />
      ) : failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl" aria-hidden>
            🌿
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="w-6 h-6 rounded-full border-2 border-mint-green border-t-transparent animate-spin" />
            <span className="text-xs">Loading image…</span>
          </div>
        </div>
      )}
    </div>
  );
}
