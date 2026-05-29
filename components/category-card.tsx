"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CategoryCardProps {
  id: string;
  title: string;
  imageUrl?: string;
  className?: string;
  href?: string;
  color?: "sage" | "gray" | "peach";
}

export function CategoryCard({
  id,
  title,
  imageUrl,
  className,
  href,
  color = "sage",
}: CategoryCardProps) {
  const colorClasses = {
    sage: "bg-nura-sage",
    gray: "bg-muted",
    peach: "bg-nura-peach",
  };

  const content = (
    <>
      <div className={cn("h-32 rounded-t-xl", colorClasses[color])}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover rounded-t-xl"
            width={128}
            height={128}
          />
        )}
      </div>
      <div className="p-3 bg-card rounded-b-xl">
        <h3 className="font-medium text-card-foreground text-sm">{title}</h3>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block rounded-xl overflow-hidden transition-transform hover:scale-[1.02]",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("rounded-xl overflow-hidden", className)}>{content}</div>
  );
}
