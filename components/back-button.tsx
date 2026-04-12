"use client";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "./ui/button";
import { ChevronLeft } from "lucide-react";
import { VariantProps } from "class-variance-authority";

function BackButton({
  className,
  variant = "ghost",
  size = "sm",
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  const router = useRouter();
  return (
    <Button
      data-paywall-passthrough
      variant={variant}
      size={size}
      onClick={() => router.back()}
      className={className}
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-sm">Back</span>
    </Button>
  );
}

export default BackButton;
