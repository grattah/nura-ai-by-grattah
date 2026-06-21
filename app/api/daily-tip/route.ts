import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import sharp from "sharp";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { utcDayKey, dailyTipsTable, type DailyTip } from "@/lib/daily-tip";

export const maxDuration = 60;

const TipSchema = z.object({
  title: z
    .string()
    .describe(
      "A short, punchy wellness tip title — max ~24 characters, e.g. 'Chew a little longer'",
    ),
  description: z
    .string()
    .describe(
      "One practical, evidence-aware wellness tip in ~115 characters (max 120). Plain prose, no markdown, no emoji.",
    ),
});

async function readTip(
  admin: ReturnType<typeof createServiceRoleClient>,
  day: string,
): Promise<DailyTip | null> {
  const { data } = await dailyTipsTable(admin)
    .select("title, description, image_url")
    .eq("day", day)
    .maybeSingle();
  if (!data) return null;
  return {
    title: data.title,
    description: data.description,
    imageUrl: data.image_url ?? undefined,
  };
}

async function generateImage(
  admin: ReturnType<typeof createServiceRoleClient>,
  day: string,
  title: string,
): Promise<string | null> {
  try {
    const result = await generateText({
      model: google("gemini-3.1-flash-image-preview"),
      providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
      prompt: `A calm, minimal wellness illustration representing "${title}". Soft natural light, clean neutral background, gentle organic shapes. No text, no watermark.`,
    });
    const image = result.files.find((f) => f.mediaType?.startsWith("image/"));
    if (!image) return null;

    const optimized = await sharp(Buffer.from(image.uint8Array))
      .resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    const path = `${day}.webp`;
    const { error: uploadErr } = await admin.storage
      .from("daily-tips")
      .upload(path, optimized, { contentType: "image/webp", upsert: true });
    if (uploadErr) throw uploadErr;

    const {
      data: { publicUrl },
    } = admin.storage.from("daily-tips").getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    // Non-fatal: the tip still renders text-only.
    console.error("[daily-tip] image generation failed", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { success } = await rateLimit(
    `daily-tip:${getClientIp(req.headers)}`,
    30,
    60_000,
  );
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const day = utcDayKey();
  const admin = createServiceRoleClient();

  // Already generated today → return it (the common path; public read).
  const existing = await readTip(admin, day);
  if (existing) return NextResponse.json(existing);

  // Bound the expensive generation path (audit M4). When CRON_SECRET is set,
  // only the Vercel cron (Authorization: Bearer <secret>) or an authenticated
  // user (homepage self-heal) may trigger generation — anonymous callers can't.
  // Back-compat: with no CRON_SECRET configured, behaviour is unchanged
  // (rate-limit + per-day idempotency already bound abuse).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const isCron =
      req.headers.get("authorization") === `Bearer ${cronSecret}`;
    if (!isCron) {
      const {
        data: { user },
      } = await (await createClient()).auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  // Generate text first (cheap/fast); clamp lengths so the card never overflows.
  let title: string;
  let description: string;
  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      // Disable Gemini 2.5's default "thinking" — it otherwise spends the whole
      // output budget on reasoning and emits no JSON (finishReason: "length").
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      maxOutputTokens: 512,
      schema: TipSchema,
      system:
        "You are a warm wellness expert for the Nuko app. Write one concise, practical, evidence-aware daily wellness tip. Plain prose only — no markdown, asterisks, or emoji.",
      prompt: `Generate today's daily wellness tip (for ${day}). Pick a useful, non-obvious angle across hydration, digestion, sleep, movement, nutrition, breathing, or stress — vary the topic day to day.`,
    });
    title = object.title.trim().slice(0, 60);
    description = object.description.trim().slice(0, 130);
  } catch (err) {
    console.error("[daily-tip] text generation failed", err);
    return NextResponse.json(
      { error: "Failed to generate tip" },
      { status: 500 },
    );
  }

  const imageUrl = await generateImage(admin, day, title);

  // Idempotent across concurrent callers + the cron (first write wins).
  await dailyTipsTable(admin).upsert(
    { day, title, description, image_url: imageUrl },
    { onConflict: "day", ignoreDuplicates: true },
  );

  // Return the authoritative row (in case another caller won the race).
  const stored = (await readTip(admin, day)) ?? {
    title,
    description,
    imageUrl: imageUrl ?? undefined,
  };
  return NextResponse.json(stored);
}
