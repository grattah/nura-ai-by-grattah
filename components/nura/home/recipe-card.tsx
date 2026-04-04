"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CardColor = "sage" | "gray";

interface CategoryCardProps {
  id: string;
  title: string;
  color?: CardColor;
  href?: string;
  imageUrl?: string;
}

const colorMap: Record<CardColor, string> = {
  sage: "#B5C9A0",
  gray: "#C4CAD4",
};

export function CategoryCard({
  id,
  title,
  color = "sage",
  href = "#",
  imageUrl,
}: CategoryCardProps) {
  return (
    <Link href={href} className="block">
      <Card
        className="relative overflow-hidden border-0 shadow-none aspect-square rounded-2xl hover:opacity-90 active:scale-[0.97] transition-all duration-150"
        style={{ backgroundColor: colorMap[color] }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {imageUrl && (
          <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        )}

        <CardContent className="absolute inset-0 p-3 flex flex-col justify-end">
          <p
            className={cn(
              "text-sm font-semibold leading-snug",
              imageUrl ? "text-white" : "text-foreground/65",
            )}
          >
            {title}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
