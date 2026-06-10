import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FindRecipePage() {
  return (
    <div className="min-h-dvh bg-background px-4 pt-5">
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/recipes/find"
          className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center hover:opacity-75 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 text-grey-c950" />
        </Link>
        <h1 className="text-lg font-semibold text-foreground">Find a recipe</h1>
      </div>
    </div>
  );
}
