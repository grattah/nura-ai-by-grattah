"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Feature = {
  id: number;
  title: string;
  description: string;
  image: string;
};

const AUTOPLAY_MS = 4000;
const SWIPE_THRESHOLD = 0.2; // fraction of the viewport width needed to change slide

export function FeatureShowcase({ features }: { features: Feature[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dragPx, setDragPx] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef(0);
  const dragPxRef = React.useRef(0);
  const pointerIdRef = React.useRef<number | null>(null);

  // Autoplay — pauses while dragging, restarts fresh after a drag ends.
  React.useEffect(() => {
    if (features.length <= 1 || isDragging) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % features.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [features.length, isDragging]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setIsDragging(true);
    // Keep receiving move/up even if the finger leaves the element.
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Gate on the ref, not isDragging state, so the very first move isn't dropped.
    if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current)
      return;
    const delta = e.clientX - startXRef.current;
    dragPxRef.current = delta;
    setDragPx(delta);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setIsDragging(false);

    const width = viewportRef.current?.offsetWidth ?? 1;
    const moved = dragPxRef.current;
    dragPxRef.current = 0;
    setDragPx(0);

    const threshold = width * SWIPE_THRESHOLD;
    if (moved <= -threshold) {
      setActiveIndex((i) => Math.min(i + 1, features.length - 1)); // left → next
    } else if (moved >= threshold) {
      setActiveIndex((i) => Math.max(i - 1, 0)); // right → prev
    }
    // below threshold → dragPx reset to 0 snaps the track back
  };

  return (
    <div>
      {/* Viewport: hides everything except the current slide */}
      <div className="overflow-hidden -mx-6" ref={viewportRef}>
        {/* Track: one row of slides, shifted by whole viewports */}
        <div
          className={cn(
            "flex touch-pan-y select-none",
            // Only animate when NOT dragging, so the finger-follow is 1:1.
            !isDragging && "transition-transform duration-500 ease-out"
          )}
          style={{
            transform: `translateX(calc(-${activeIndex * 100}% + ${dragPx}px))`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {features.map((feature) => (
            <div key={feature.id} className="shrink-0 w-full px-6">
              <Image
                src={feature.image}
                alt={feature.title}
                width={366}
                height={326}
                className="w-full"
                priority
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots: pure indicators now */}
      <div className="mt-4 flex justify-center gap-2">
        {features.map((feature, i) => (
          <span
            key={feature.id}
            className={cn(
              "h-3 w-3 rounded-full transition-all",
              i === activeIndex ? "bg-mint-green" : " bg-[#C7C2B2]"
            )}
          />
        ))}
      </div>

      {/* Cards, green border follows the active slide */}
      <div className="mt-6 flex flex-col gap-3">
        {features.map((feature, i) => (
          <div
            key={feature.id}
            className={cn(
              "w-full max-w-85.5 bg-[#EDEBDF] p-3.5 rounded-2xl flex flex-col gap-2 border transition-colors",
              i === activeIndex ? "border-mint-green" : "border-[#E1DDCA]"
            )}
          >
            <p className="text-base-text font-bold font-redHatDisplay leading-[22px] text-xl">
              {feature.title}
            </p>
            <p className="font-redHatDisplay font-medium text-sm text-subtle leading-[22px]">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
