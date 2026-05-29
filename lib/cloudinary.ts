/**
 * Injects Cloudinary transformation params into an existing upload URL.
 * Works by inserting params after `/upload/` in the URL.
 */

export function getCloudinaryUrl(
  url: string,
  {
    width,
    height,
    quality = "auto",
    format = "auto",
    crop = "fill",
    gravity = "auto", // smart-crop around the subject
    blur, // blur amount e.g. 800 for placeholder
    grayscale, // convert to grayscale
    brightness, // -100 to 100
  }: {
    width: number;
    height?: number;
    quality?: number | "auto";
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
    crop?: "fill" | "fit" | "scale" | "thumb";
    gravity?: "auto" | "face" | "center";
    blur?: number;
    grayscale?: boolean;
    brightness?: number;
  },
): string {
  if (!url?.includes("/upload/")) return url;

  const transforms = [
    `w_${width}`,
    height ? `h_${height}` : null,
    `c_${crop}`,
    `g_${gravity}`,
    `f_${format}`,
    `q_${quality}`,
    "dpr_auto",
    blur ? `e_blur:${blur}` : null,
    grayscale ? "e_grayscale" : null,
    brightness ? `e_brightness:${brightness}` : null,
  ]
    .filter(Boolean)
    .join(",");

  return url.replace("/upload/", `/upload/${transforms}/`);
}

/**
 * Fetches a 10×10 blurred version of the image from Cloudinary and returns
 * it as a base64 data URL suitable for Next.js `blurDataURL`.
 * Safe to call in Server Components — Next.js dedupes identical fetch calls.
 */
export async function getBlurDataURL(url: string): Promise<string | undefined> {
  if (!url) return undefined;

  try {
    const tinyUrl = getCloudinaryUrl(url, {
      width: 10,
      height: 10,
      quality: 1,
      format: "webp",
    }).replace("/upload/", "/upload/e_blur:800/");

    const res = await fetch(tinyUrl, { next: { revalidate: 86400 } }); // cache 24h
    if (!res.ok) return undefined;

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = res.headers.get("content-type") ?? "image/webp";
    return `data:${mime};base64,${base64}`;
  } catch {
    return undefined;
  }
}
