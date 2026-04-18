"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuickTipCardProps {
  title?: string;
  description?: string;
  href?: string;
}

export function QuickTipCard({
  title = "Breast Health Assessment",
  description = "Assess your risk factors in 2 minutes",
  href = "/risk-checker",
}: QuickTipCardProps) {
  return (
    <Link href={href} className="block">
      <Card
        className="border-0 rounded-2xl shadow-none hover:opacity-90 active:scale-[0.98] transition-all duration-150 p-0"
        style={{ backgroundColor: "#F9A8D4" }} // Switched to a soft pink-rose to align with the theme
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-3 px-4 py-3.5">
            {/* Action Icon */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-white/30 backdrop-blur-sm">
              <ShieldCheck className="w-5 h-5 text-black/75" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight text-black/75">
                {title}
              </p>
              <p className="text-xs leading-tight mt-0.5 truncate text-black/70">
                {description}
              </p>
            </div>

            <ChevronRight className="w-4 h-4 shrink-0 text-black/75" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
