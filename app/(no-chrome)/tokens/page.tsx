import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import TokensCard from "@/components/tokens/TokensCard";
import TokensModal from "@/components/tokens/TokensModal";
import BackButton from "@/components/back-button";

const page = () => {
  return (
    <div className="min-h-dvh bg-background pb-10">
      <main className="px-6 max-[400px]:px-4">
        <div className="flex items-center justify-between pt-5 pb-4 gap-3 mb-3.5">
          <BackButton className="p-3 max-[400px]:p-2 rounded-full bg-[#E8E6DC] hover:opacity-70 transition-opacity" />
          <div>
            <h1 className="flex-1 text-center text-xl max-[400px]:text-lg font-semibold text-base-text capitalize">
              Tokens
            </h1>
            <p className="text-sm max-[400px]:text-xs text-subtle">
              Manage your token
            </p>
          </div>
          <div className="size-10 shrink-0" aria-hidden />
        </div>

        <div className="flex flex-col gap-8">
          <TokensCard />
          <div className="w-full border border-[#E2E4E4]" />
          <TokensModal />
        </div>
      </main>
    </div>
  );
};

export default page;
