"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";

interface BottomSheetProps
  extends React.ComponentProps<typeof DrawerPrimitive.Content> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zIndex?: number;
  showHandle?: boolean;
}

export function BottomSheet({
  open,
  onOpenChange,
  zIndex = 30,
  showHandle = true,
  className,
  children,
  ...props
}: BottomSheetProps) {
  const keyboardOffset = useKeyboardOffset(open);

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay
          className="fixed inset-0 bg-[#F3F1E8] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ zIndex }}
        />
        <DrawerPrimitive.Content
          data-slot="bottom-sheet-content"
          className={cn(
            "bg-[#F3F1E8] fixed inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-4xl shadow-lg outline-none",
            className,
          )}
          style={{ zIndex: zIndex + 1 }}
          {...props}
        >
          {showHandle && (
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-[#F3F1E8]" />
          )}
          <div
            className="flex min-h-0 flex-1 flex-col pb-safe transition-transform duration-300 ease-out"
            style={{
              transform:
                keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
            }}
          >
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
