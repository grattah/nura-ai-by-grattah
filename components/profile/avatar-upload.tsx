"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    startTransition(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (error) {
        console.error("[avatar-upload]", error.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      onUploaded?.(publicUrl);
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
