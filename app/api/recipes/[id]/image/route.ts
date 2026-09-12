import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import sharp from "sharp";
import { getCachedUser, createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { recordUsage } from "@/lib/usage-server";
import { RECIPE_IMAGE_GENERATION_ENABLED } from "@/lib/recipe-visibility";

export const maxDuration = 60;

/** Generates (or returns) a recipe's hero image. */
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

  if (recipe.image_url) {
    return NextResponse.json({ imageUrl: recipe.image_url });
  }

  const isOwner = recipe.created_by === user.id;
  const isAdmin = isOwner ? false : !!(await getAdminIdentity());
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!RECIPE_IMAGE_GENERATION_ENABLED) {
    return NextResponse.json({ imageUrl: null, suspended: true });
  }

  try {
    const result = await generateText({
      model: google("gemini-3.1-flash-image-preview"),
      providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
      prompt: `Appetizing, photorealistic photo of "${recipe.title}", a wellness drink. Soft natural light, clean neutral background, 45-degree food photography, vibrant and fresh. No text, no watermark.`,
    });
    const image = result.files.find((f) => f.mediaType?.startsWith("image/"));
    if (!image) throw new Error("model returned no image");

    const optimized = await sharp(Buffer.from(image.uint8Array))
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
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

    if (isOwner) {
      const usage = result.usage as
        | { totalTokens?: number; inputTokens?: number; outputTokens?: number }
        | undefined;
      const rawTokens =
        usage?.totalTokens ??
        (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
      void recordUsage({
        surface: "recipe-image",
        userId: user.id,
        billed: false,
        totalTokens: rawTokens,
        provider: "google",
        model: "gemini-3.1-flash-image-preview",
        images: 1,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
      });
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
