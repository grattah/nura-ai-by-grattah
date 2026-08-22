"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  zIndex?: number;
  showHandle?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function BottomSheet({
  zIndex = 30,
  showHandle = true,
  className,
  children,
}: BottomSheetProps) {
  return (
    <div
      data-slot="bottom-sheet-content"
      className={cn(
        "fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-4xl bg-[#F3F1E8] shadow-lg",
        className,
      )}
      style={{ zIndex }}
    >
      {showHandle && (
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-[#D8D4C8]" />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-safe">
        {children}
      </div>
    </div>
  );
}