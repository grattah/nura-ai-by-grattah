"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getCloudinaryUrl } from "@/lib/cloudinary";
import { RECIPE_IMAGE_GENERATION_ENABLED } from "@/lib/recipe-visibility";

/**
 * Recipe hero image. While RECIPE_IMAGE_GENERATION_ENABLED is off this is purely
 * presentational — the detail page only mounts it for recipes that already have an
 * image, and no generation request is made.
 *
 * When generation is reinstated: generated recipes are created with
 * `image_url = null` and the image is produced lazily on first view by an awaited
 * request to `/api/recipes/[id]/image` (reliable on serverless, errors
 * observable). The spinner shows while it generates, then the image swaps in.
 */
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
  // With generation suspended, "no image" is terminal rather than pending — start
  // in the failed state so an imageless render shows the placeholder instead of a
  // spinner that would never resolve.
  const [failed, setFailed] = useState(!RECIPE_IMAGE_GENERATION_ENABLED);
  const triggered = useRef(false);

  useEffect(() => {
    // Fire exactly once per recipe. The `triggered` ref survives React Strict
    // Mode's dev setup→cleanup→setup, so we must NOT gate the result on a
    // per-effect "cancelled" flag (the cleanup would discard the only in-flight
    // request's result). React safely ignores a setState on a truly unmounted
    // component.
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
          // Cloudinary URLs are already CDN-optimized; Supabase-hosted images
          // (AI-generated) are served directly to avoid the Next optimizer
          // timing out fetching/re-encoding them.
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
