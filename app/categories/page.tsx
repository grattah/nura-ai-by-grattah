"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/nura/filter-pills";
import { filterPills, dummyCategories } from "@/lib/nura-dummy-data";

export default function AllCategoriesPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const visibleCategories =
    activeFilter === "all"
      ? dummyCategories
      : dummyCategories.filter((c) => c.filterGroup === activeFilter);

  return (
    <div className="min-h-screen bg-background">
      {/* Sub-header: back + page title */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="p-0 h-auto min-h-11 min-w-11 text-foreground hover:opacity-70 transition-opacity gap-1 font-normal"
        >
          <Link href="/">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-foreground">All Categories</h1>
      </div>

      {/* Filter pills — purely in-place, no navigation */}
      <div className="px-4 mb-5">
        <FilterPills
          pills={filterPills}
          active={activeFilter}
          onChange={setActiveFilter}
        />
      </div>

      {/* 2-col grid */}
      <main className="px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {visibleCategories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`}>
              <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card hover:opacity-90 active:scale-[0.97] transition-all duration-150">
                {/* Image area */}
                <div className="w-full bg-muted" style={{ aspectRatio: "4/3" }}>
                  {category.imageUrl && (
                    <img
                      src={category.imageUrl}
                      alt={category.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {/* Label — text-sm minimum per accessibility fix */}
                <CardContent className="px-4 py-3 min-h-11 flex items-center">
                  <p className="text-sm font-semibold text-foreground leading-snug">
                    {category.title}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {visibleCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base text-muted-foreground">
              No categories found for this filter.
            </p>
            <Button
              variant="ghost"
              onClick={() => setActiveFilter("all")}
              className="mt-3 text-sm min-h-11"
            >
              Show all
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
