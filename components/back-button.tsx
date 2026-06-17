"use client";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { VariantProps } from "class-variance-authority";

function BackButton({
  className,
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  const router = useRouter();
  return (
    <button
      data-paywall-passthrough
      onClick={() => router.back()}
      className={className}
    >
      <ArrowLeft size={16} color="#1B1D1D" className="max-xs:size-2.5" />
    </button>
  );
}

export default BackButton;
