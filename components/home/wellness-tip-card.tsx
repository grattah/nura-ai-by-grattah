"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface WellnessTipCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  /** True when the server served the fallback (today's tip wasn't ready yet). */
  stale?: boolean;
}

export function WellnessTipCard({
  title,
  description,
  imageUrl,
  stale = false,
}: WellnessTipCardProps) {
  const [tip, setTip] = useState({ title, description, imageUrl });
  const healed = useRef(false);

  // Self-heal: if we got the fallback, fetch (and generate-on-miss) today's tip
  // and swap it in. Runs once. No-op on cron-warmed days (stale=false).
  useEffect(() => {
    if (!stale || healed.current) return;
    healed.current = true;
    fetch("/api/daily-tip")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.title && data?.description) {
          setTip({
            title: data.title,
            description: data.description,
            imageUrl: data.imageUrl,
          });
        }
      })
      .catch(() => {
        /* keep the fallback */
      });
  }, [stale]);

  return (
    <div className="bg-white border-grey-c100 rounded-xl flex gap-4">
      <div className="basis-2/3 min-w-0 p-3">
        <div className="flex items-center gap-1 mb-4">
          <Image
            src="/logo-filled.svg"
            alt="Nuko Logo"
            width={21}
            height={20}
            className="shrink-0 size-5"
          />
          <p className="text-xs font-semibold text-mint-green uppercase leading-none tracking-wider">
            Daily Wellness Tip
          </p>
        </div>
        <p className="text-base font-medium text-subtle leading-none mb-2">
          {tip.title}
        </p>
        <p className="text-xs text-subtle leading-relaxed">{tip.description}</p>
      </div>
      {tip.imageUrl && (
        <div className="basis-1/3 relative rounded-r-xl overflow-hidden shrink-0 bg-muted">
          <Image
            src={tip.imageUrl}
            alt={tip.title}
            fill
            sizes="30vw"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}
