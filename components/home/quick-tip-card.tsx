"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuickTipCardProps {
  title?: string;
  description?: string;
  href?: string;
}

export function QuickTipCard({
  title = "Gain Body Mass",
  description = "Consume a calorie surplus of 300–500 daily",
  href = "#",
}: QuickTipCardProps) {
  return (
    <Link href={href} className="block">
      <Card
        className="border-0 rounded-2xl shadow-none hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        style={{ backgroundColor: "#E8836A" }}
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-4 py-3.5">
            {/* Heartbeat icon */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-foreground/15">
              <HeartbeatIcon />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground/80">
                Quick Tip - {title}
              </p>
              <p className="text-xs leading-tight mt-0.5 truncate text-foreground/55">
                {description}
              </p>
            </div>

            <ChevronRight className="w-4 h-4 shrink-0 text-foreground/40" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function HeartbeatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 9H5L7 5L9 13L11 9H16"
        stroke="currentColor"
        className="text-foreground/55"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
