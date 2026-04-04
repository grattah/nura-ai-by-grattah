"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

interface TodaysRecipeCardProps {
  category?: string;
  date?: string;
  title?: string;
  description?: string;
  bodyAffected?: string;
  likelyCauses?: string;
  symptoms?: string;
}

export function TodaysRecipeCard({
  category = "Wellness",
  date = "22nd Mar, 2026",
  title = "Today's Recipe",
  description = "Discover insights that help you understand your health better.",
  bodyAffected = "Discover insights that help you understand your health better.",
  likelyCauses = "Discover insights that help you understand your health better.",
  symptoms = "Discover insights that help you understand your health better.",
}: TodaysRecipeCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Hero Card ──────────────────────────────────────────────────────── */}
      <Card
        className="relative overflow-hidden border-0 rounded-3xl shadow-none"
        style={{ backgroundColor: "#E8836A" }}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "160px 160px",
          }}
        />

        <CardContent className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              {/* Breadcrumb */}
              <p className="text-xs font-medium tracking-wide mb-2 text-foreground/55">
                {category} → {date}
              </p>

              {/* Title */}
              <h2 className="text-2xl font-bold leading-tight mb-2 text-foreground/80">
                {title}
              </h2>

              {/* Description */}
              <p className="text-sm leading-snug mb-5 max-w-50 text-foreground/55">
                {description}
              </p>

              {/* CTA */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOpen(true)}
                className="rounded-full bg-white/90 hover:bg-white text-foreground/75 font-semibold px-4 h-9 shadow-none border-0"
              >
                Explore →
              </Button>
            </div>

            {/* Plant icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 mt-1"
              style={{ backgroundColor: "#5C6B3A" }}
            >
              <PlantIcon />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="border-0 rounded-t-3xl focus:outline-none bg-background"
          style={{ maxHeight: "96svh" }}
        >
          {/* Hide default vaul drag handle */}
          <div className="mx-auto mt-2 h-1 w-10 rounded-full opacity-0" />

          <div className="flex flex-col overflow-y-auto px-5 pt-2 pb-10">
            {/* Close row */}
            <div className="flex justify-end mb-4">
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full hover:opacity-80 border-0 bg-muted"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DrawerClose>
            </div>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "#5C6B3A" }}
              >
                <PlantIcon />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
                Today's Recipe
              </h2>
              <p className="text-sm leading-relaxed max-w-65 text-muted-foreground">
                Discover insights that help you understand your health better.
              </p>
            </div>

            {/* Info cards */}
            <div className="space-y-3">
              {/* Card 1 — Body + Causes */}
              <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-secondary">
                <CardContent className="p-0">
                  <div className="px-5 py-4">
                    <h3 className="text-base font-bold mb-1 text-foreground">
                      Part Of Body Affected
                    </h3>
                    <p className="text-sm leading-snug text-muted-foreground">
                      {bodyAffected}
                    </p>
                  </div>
                  <Separator className="bg-border" />
                  <div className="px-5 py-4">
                    <h3 className="text-base font-bold mb-1 text-foreground">
                      Most Likely Causes
                    </h3>
                    <p className="text-sm leading-snug text-muted-foreground">
                      {likelyCauses}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 — Symptoms + CTA */}
              <Card
                className="border-0 rounded-3xl shadow-none overflow-hidden relative"
                style={{ backgroundColor: "#FAF0EE" }}
              >
                {/* Decorative diagonal lines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.18]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(135deg, #E8836A 0px, #E8836A 1px, transparent 1px, transparent 38px)",
                  }}
                />
                <CardContent className="relative p-5">
                  <h3 className="text-base font-bold mb-1 text-foreground">
                    Possible Symptoms
                  </h3>
                  <p className="text-sm leading-snug mb-5 text-muted-foreground">
                    {symptoms}
                  </p>
                  <Button className="w-full rounded-full bg-foreground hover:bg-foreground/85 text-background font-semibold text-sm h-12 shadow-none border-0">
                    Tap to find treatment →
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function PlantIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17 28V16"
        stroke="#D4C48A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 20C17 20 12 18 11 13C11 13 15 13 17 17"
        fill="#D4C48A"
        stroke="#D4C48A"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 16C17 16 22 14 23 9C23 9 19 9 17 13"
        fill="#C8B878"
        stroke="#C8B878"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 16C17 16 17 10 20 7C20 7 22 11 17 16Z"
        fill="#D4C48A"
        stroke="#D4C48A"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
