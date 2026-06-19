import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import sharp from "sharp";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { meterUnits } from "@/lib/credits-server";
import { IMAGE_UNITS } from "@/lib/credits";

export const maxDuration = 60;

/**
 * Generates (or returns) a recipe's hero image. Triggered by the detail page on
 * first view. Doing it as a normal awaited request — rather than background
 * `after()` work — makes it reliable on serverless and surfaces errors.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const {
    data: { user },
  } = await getCachedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  // `created_by` isn't in the generated types yet, so the row is cast.
  const { data: recipeRaw } = await admin
    .from("recipes")
    .select("id, title, image_url, created_by")
    .eq("id", id)
    .maybeSingle();
  const recipe = recipeRaw as unknown as {
    id: string;
    title: string;
    image_url: string | null;
    created_by: string | null;
  } | null;

  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Idempotent: if an image already exists, just return it.
  if (recipe.image_url) {
    return NextResponse.json({ imageUrl: recipe.image_url });
  }

  // Only the recipe's creator or an admin may trigger generation.
  const isOwner = recipe.created_by === user.id;
  const isAdmin = isOwner ? false : !!(await getAdminIdentity());
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await generateText({
      model: google("gemini-3.1-flash-image-preview"),
      providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
      prompt: `Appetizing, photorealistic photo of "${recipe.title}", a wellness drink or dish. Soft natural light, clean neutral background, 45-degree food photography, vibrant and fresh. No text, no watermark.`,
    });
    const image = result.files.find((f) => f.mediaType?.startsWith("image/"));
    if (!image) throw new Error("model returned no image");

    // The model returns a large full-resolution PNG (often 1–3 MB). Downscale
    // and recompress to WebP before storing so the hero/cards load fast and the
    // Next.js image optimizer doesn't time out fetching a multi-MB source.
    const optimized = await sharp(Buffer.from(image.uint8Array))
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    const path = `${id}.webp`;
    const { error: uploadErr } = await admin.storage
      .from("recipe-images")
      .upload(path, optimized, {
        contentType: "image/webp",
        upsert: true,
      });
    if (uploadErr) throw uploadErr;

    const {
      data: { publicUrl },
    } = admin.storage.from("recipe-images").getPublicUrl(path);

    await admin.from("recipes").update({ image_url: publicUrl }).eq("id", id);

    // Account for the Gemini image cost: a fixed unit charge to the recipe's
    // creator (image models bill per-image, so no token divisor). Admin-triggered
    // generations for the catalogue are not charged. Not gated — this is the
    // deferred completion of an already-initiated generate.
    if (isOwner) {
      const usage = result.usage as
        | { totalTokens?: number; inputTokens?: number; outputTokens?: number }
        | undefined;
      const rawTokens =
        usage?.totalTokens ??
        (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
      await meterUnits(user.id, IMAGE_UNITS, "recipe-image", rawTokens);
    }

    return NextResponse.json({ imageUrl: publicUrl });
  } catch (err) {
    console.error("[recipes/image]", err);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
