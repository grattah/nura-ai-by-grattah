"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import PrivacyComponent from "@/components/terms/PrivacyComponent";
import TermsComponent from "@/components/terms/TermsComponent";
import BackButton from "@/components/back-button";

const page = () => {
  const [pageState, setPageState] = React.useState("privacy");

  return (
    <div className="min-h-dvh bg-background pb-10">
      <main className="px-6 max-xs:px-4">
        <div className="flex items-center pt-5 pb-4 gap-3 mb-2.5">
          <BackButton className="size-10 rounded-full bg-[#E8E6DC] flex items-center justify-center shrink-0 hover:opacity-75 transition-opacity" />
          <h1 className="flex-1 text-center text-xl max-xs:text-lg font-semibold text-base-text">
            Terms and Privacy
          </h1>
          <div className="size-10 shrink-0" aria-hidden />
        </div>

        <div className="w-full rounded-full p-1 flex items-center liquid-glass">
          <button
            onClick={() => setPageState("privacy")}
            className={`flex-1 w-full text-center py-3 rounded-full text-sm ${
              pageState === "privacy"
                ? "text-[#0A4A41] bg-black/12 font-semibold"
                : "text-subtle font-medium"
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setPageState("terms")}
            className={`flex-1 w-full text-center py-3 rounded-full text-sm ${
              pageState === "terms"
                ? "text-[#0A4A41] bg-black/12 font-semibold"
                : "text-subtle font-medium"
            }`}
          >
            Terms of service
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-5">
          <p className="text-sm text-subtle font-medium">
            Last updated: June 2026
          </p>
          <div className="bg-[#E8E6DC] py-4 px-3 rounded-2xl">
            {pageState === "privacy" ? (
              <div className="flex flex-col gap-2.5 text-[#333333E5] font-medium max-[400px]:text-sm">
                <p>Welcome to Nuko Health (“we,” “our,” or “us”).</p>
                <p>
                  We respect your privacy and are committed to protecting your
                  personal information. This Privacy Policy explains how we
                  collect, use, and protect your information when you use the
                  Nuko Health website, web app, and related services.
                </p>
              </div>
            ) : pageState === "terms" ? (
              <div className="text-[#333333E5] font-medium max-[400px]:text-sm">
                <p>
                  These Terms of Service govern your use of the Nuko Health
                  website, web app, and related services.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {pageState === "privacy" && <PrivacyComponent />}

        {pageState === "terms" && <TermsComponent />}
      </main>
    </div>
  );
};

export default page;
