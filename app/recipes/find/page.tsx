"use client";

import React from "react";
import Link from "next/link";
import {
  Search,
  X,
  Clock,
  GlassWater,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

const page = () => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [step, setStep] = React.useState(2);

  return (
    <div className="bg-background">
      <main className="px-4 pt-6">
        <p className="font-semibold text-xl">Find recipe</p>

        <div className="mt-8">
          <div className="relative">
            <button className="absolute top-3.75 left-3">
              <Search color="#82A198" size={16} />
            </button>
            <input
              name="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text"
              className="w-full bg-[#FFFFFF] py-3 pl-9 pr-3 rounded-lg border border-[#E6ECEA] text-sm placeholder:text-[#9CA5A3] focus:ring-2 focus:ring-ring outline-none"
              placeholder="Search recipe..."
            />
            {searchTerm.length > 0 && (
              <button
                className="absolute top-3.75 right-3"
                onClick={() => setSearchTerm("")}
              >
                <X color="#9CA5A3" size={16} />
              </button>
            )}
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="mt-8 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#57605E]">Recently searched</p>
                <p className="text-[#227B6F] underline font-semibold text-sm">
                  Clear
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Ginger-lemon shot</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Ginger-lemon shot</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <Clock size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Ginger-lemon shot</p>
                </div>
              </div>
            </div>

            <div className="mt-14 flex flex-col gap-5">
              <p className="text-sm text-[#57605E]">You may like</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Morning green resilience bowl</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Morning green resilience bowl</p>
                </div>
                <div className="flex items-center gap-3 border-b border-[#E2E4E4] pb-3">
                  <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                  <p className="font-medium">Morning green resilience bowl</p>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mt-8 flex flex-col gap-24">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Results</p>
                  <p className="text-sm text-[#57605E]">5 recipes found</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                  <div className="flex items-center justify-between border-b border-[#E2E4E4] pb-3">
                    <div className="flex items-center gap-3">
                      <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                      <p className="font-medium">
                        Morning green resilience bowl
                      </p>
                    </div>
                    <ChevronRight size={16} color="#3F4644" />
                  </div>
                </div>
              </div>
              <button
                className="border border-[#227B6F] w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={() => setStep(3)}
              >
                <Sparkles color="#227B6F" size={20} strokeWidth={2} />
                <span className="text-[#227B6F] font-medium">
                  Get more suggestions
                </span>
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mt-8 flex flex-col gap-24">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <p className="font-medium">More recipes for you</p>
                  <p className="text-sm text-[#57605E]">
                    Here are more recipes we found
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/recipes/b1fe27ea-a018-4238-be1a-8504a90efe2b"
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-[#E8E6DC]"
                  >
                    <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                    <p className="font-medium">Morning green resilience bowl</p>
                  </Link>
                  <Link
                    href="/recipes/b1fe27ea-a018-4238-be1a-8504a90efe2b"
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-[#E8E6DC]"
                  >
                    <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                    <p className="font-medium">Morning green resilience bowl</p>
                  </Link>
                  <Link
                    href="/recipes/b1fe27ea-a018-4238-be1a-8504a90efe2b"
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-[#E8E6DC]"
                  >
                    <GlassWater size={20} color="#9CA5A3" strokeWidth={2} />
                    <p className="font-medium">Morning green resilience bowl</p>
                  </Link>
                </div>
              </div>
              <button
                className="border border-[#227B6F] w-full py-4 flex items-center justify-center gap-3 rounded-full"
                onClick={() => setStep(2)}
              >
                <ArrowLeft color="#227B6F" size={20} strokeWidth={2} />
                <span className="text-[#227B6F] font-medium">
                  Back to results
                </span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default page;
