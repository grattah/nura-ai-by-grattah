"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_MB = 5;
const MAX_AVATAR_BYTES = MAX_AVATAR_MB * 1024 * 1024;

interface AvatarUploadProps {
  avatarUrl?: string | null;
  avatarLetter: string;
  userId: string;
  onUploaded?: (url: string) => void;
}

export function AvatarUpload({
  avatarUrl,
  avatarLetter,
  userId,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Last image we know is actually persisted — used to roll the preview back if
  // an upload fails, so the UI never claims a change that didn't stick.
  const lastGoodUrl = useRef<string | null>(avatarUrl ?? null);

  const handleFile = (file: File) => {
    setError(null);

    // Validate up front with specific reasons.
    if (!file.type.startsWith("image/")) {
      setError(
        `"${file.name}" isn't an image (${file.type || "unknown type"}). Please choose a JPG, PNG, or WebP file.`,
      );
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(
        `Image is too large (${sizeMb} MB). Please choose a photo under ${MAX_AVATAR_MB} MB.`,
      );
      return;
    }

    // Optimistic preview while the upload runs.
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    startTransition(async () => {
      try {
        const supabase = createClient();
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${userId}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadError) {
          setError(`Couldn't upload your photo: ${uploadError.message}`);
          setPreview(lastGoodUrl.current);
          return;
        }

        // The path is reused on every change, so the public URL is identical
        // between uploads — append a cache-busting token so the browser/CDN
        // fetches the new image instead of serving the stale cached one (which
        // made the avatar appear to revert to the previous photo).
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

        const { error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });

        if (updateError) {
          setError(
            `Photo uploaded, but saving it to your profile failed: ${updateError.message}`,
          );
          setPreview(lastGoodUrl.current);
          return;
        }

        lastGoodUrl.current = publicUrl;
        setPreview(publicUrl);
        onUploaded?.(publicUrl);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Please try again.";
        setError(`Something went wrong while updating your photo. ${message}`);
        setPreview(lastGoodUrl.current);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative"
        disabled={isPending}
      >
        <div className="size-31.25 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {preview ? (
            <Image
              src={preview}
              alt="Avatar"
              width={125}
              height={125}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <span
              className="text-2xl font-bold"
              style={{ color: "#D4C48A", backgroundColor: "#5C6B3A" }}
            >
              {avatarLetter}
            </span>
          )}
        </div>
        {/* Camera badge */}
        <div
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-background"
          style={{ backgroundColor: "var(--mint-green)" }}
        >
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-sm font-medium"
        style={{ color: "var(--mint-green)" }}
        disabled={isPending}
      >
        {isPending ? "Uploading…" : "Change photo"}
      </button>

      {error && (
        <p className="text-sm text-red-500 text-center max-w-xs">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so re-selecting the same file still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}
