"use client";

import type { ReactNode, ElementType } from "react";
import {
  Leaf,
  Dumbbell,
  Apple,
  Flame,
  Candy,
  Droplet,
  Soup,
  type LucideIcon,
} from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  nutritionBreakdown,
  type NutritionPointInput,
  type NutritionPointRow,
} from "@/lib/scoring/nutrition-breakdown";
import Muscle from "../vectors/muscle";
import Calories from "../vectors/calories";
import Salt from "../vectors/salt";
import sugar from "../vectors/sugar";
import OilDroplet from "../vectors/oil-droplet";

const ICONS: Record<string, ElementType | LucideIcon> = {
  fiber: Leaf,
  protein: Muscle,
  fvl: Apple,
  energy: Calories,
  sugar: sugar,
  satFat: OilDroplet,
  salt: Salt,
};

function PointRow({ row, sign }: { row: NutritionPointRow; sign: "+" | "-" }) {
  const Icon = ICONS[row.key];
  return (
    <li className="flex items-center gap-3 rounded-xl bg-white pl-3 pr-5 py-4 shadow-xs">
      {Icon && (
        <Icon className="size-6 shrink-0 text-subtle" strokeWidth={1.5} />
      )}
      <span className="flex-1 text-base font-medium text-subtle">
        {row.label}
      </span>
      <span
        className={`shrink-0 text-lg font-bold ${
          sign === "+" ? "text-success-c700" : "text-[#DC2323]"
        }`}
      >
        {row.points !== 0 && sign}
        {row.points}
      </span>
    </li>
  );
}

export function NutritionScoreDrawer({
  points,
  children,
}: {
  points: NutritionPointInput;
  children: ReactNode;
}) {
  const { earned, lost } = nutritionBreakdown(points);

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="bg-[#FAFAF9] rounded-t-4xl!">
        <DrawerHeader className="pb-2 mb-4">
          <DrawerTitle className="text-xl text-black font-semibold">
            Nutrition Score Breakdown
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            The points this recipe earned and lost across the nutrition score
            components.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-2 flex flex-col gap-5">
          <section className="flex flex-col gap-y-3">
            <p className="text-base font-semibold text-subtle">Points earned</p>
            <ul className="flex flex-col gap-2">
              {earned.map((row) => (
                <PointRow key={row.key} row={row} sign="+" />
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-base font-semibold text-subtle">Points lost</p>
            <ul className="flex flex-col gap-y-3">
              {lost.map((row) => (
                <PointRow key={row.key} row={row} sign="-" />
              ))}
            </ul>
          </section>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <button
              type="button"
              className="w-full rounded-full bg-mint-green py-3.5 text-base font-medium text-white hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
