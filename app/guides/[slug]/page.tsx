"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Flame, Leaf } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FollowUpSection } from "@/components/follow-up-section";
import { dummyGuides, dummyRiskItems, RiskItem } from "@/lib/nura-dummy-data";
import { cn } from "@/lib/utils";
import { PaywallGate } from "@/components/paywall/paywall-gate";

// ─── Risk level config ────────────────────────────────────────────────────────
const levelConfig = {
  1: {
    dot: "bg-red-500",
    badgeBg: "#FEEAEA",
    badgeText: "#E53535",
    label: "Level 1",
  },
  2: {
    dot: "bg-orange-400",
    badgeBg: "#FEF3E2",
    badgeText: "#D97706",
    label: "Level 2",
  },
  3: {
    dot: "bg-yellow-400",
    badgeBg: "#FEFCE8",
    badgeText: "#CA8A04",
    label: "Level 3",
  },
} as const;

const riskLabelConfig: Record<
  RiskItem["riskLabel"],
  { bg: string; text: string; icon: React.ReactNode }
> = {
  "High Risk": {
    bg: "#FEEAEA",
    text: "#E53535",
    icon: <Flame className="w-3 h-3" />,
  },
  "Medium Risk": {
    bg: "#EBF4FF",
    text: "#3B82F6",
    icon: <span className="w-3 h-3 text-base leading-none">💧</span>,
  },
  "Low Risk": {
    bg: "#ECFDF5",
    text: "#059669",
    icon: <Leaf className="w-3 h-3" />,
  },
};

// This page is the concrete implementation of the "high-cancer-risks" guide.
// The slug is the contextId used to scope Pinecone/Supabase vector queries.
const GUIDE_SLUG = "high-cancer-risks";

export default function GuidesPage() {
  const router = useRouter();

  // Pull title + description + follow-up questions from the guide record
  // so they stay in sync with the data layer — no hardcoded strings here.
  const guide = dummyGuides.find((g) => g.slug === GUIDE_SLUG);
  const title = guide?.title ?? "High Cancer Risks";
  const description = guide?.description ?? "";
  const staticQuestions = guide?.followUpQuestions ?? [];

  return (
    <PaywallGate>
      <div className="min-h-screen bg-background">
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <header className="px-4 pt-12 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-0 h-auto text-foreground hover:opacity-70 transition-opacity gap-1 font-normal mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Button>
          <h1 className="text-2xl font-bold text-foreground mb-1 leading-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground leading-snug max-w-xs">
            {description}
          </p>
        </header>

        <main className="px-4 pb-10 space-y-4">
          {/* ── Risk Level Legend ────────────────────────────────────────────── */}
          <Card className="border-0 rounded-2xl shadow-none bg-card">
            <CardContent className="px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground mr-1">
                  Risk Level :
                </span>
                {([1, 2, 3] as const).map((lvl, i) => (
                  <div key={lvl} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <Separator
                        orientation="vertical"
                        className="h-3 bg-border mx-0.5"
                      />
                    )}
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        levelConfig[lvl].dot,
                      )}
                    />
                    <span className="text-sm text-foreground/70">
                      {levelConfig[lvl].label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Risk Item Cards ──────────────────────────────────────────────── */}
          <div className="space-y-3">
            {dummyRiskItems.map((item) => (
              <RiskCard key={item.id} item={item} />
            ))}
          </div>

          {/* ── Follow Up Questions + RAG chat ───────────────────────────────── */}
          <div className="pt-2">
            <FollowUpSection
              contextId={GUIDE_SLUG}
              contextType="guide"
              title={title}
              description={description}
              savedQuestions={staticQuestions}
            />
          </div>
        </main>
      </div>
    </PaywallGate>
  );
}

// ─── RiskCard ─────────────────────────────────────────────────────────────────
function RiskCard({ item }: { item: RiskItem }) {
  const lvl = levelConfig[item.level];
  const risk = riskLabelConfig[item.riskLabel];

  return (
    <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card">
      <CardContent className="p-4">
        <div className="flex gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl bg-muted shrink-0 overflow-hidden">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground leading-snug mb-0.5">
              {item.title}
            </p>
            <p className="text-xs text-muted-foreground leading-snug">
              {item.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: lvl.badgeBg, color: lvl.badgeText }}
          >
            <span className={cn("w-2 h-2 rounded-full shrink-0", lvl.dot)} />
            {lvl.label}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: risk.bg, color: risk.text }}
          >
            {risk.icon}
            {item.riskLabel}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground leading-snug">
            <span className="mr-1">•</span>
            Cancer Type:{" "}
            <span className="font-bold text-foreground">{item.cancerType}</span>
          </p>
          <p className="text-xs text-muted-foreground leading-snug">
            <span className="mr-1">•</span>
            Risks From:{" "}
            <span className="font-bold text-foreground">{item.risksFrom}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
