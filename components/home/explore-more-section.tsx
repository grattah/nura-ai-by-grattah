"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { exploreMoreItems } from "@/lib/nura-dummy-data";

interface ExploreMoreSectionProps {
  items?: typeof exploreMoreItems;
}

export function ExploreMoreSection({
  items = exploreMoreItems,
}: ExploreMoreSectionProps) {
  return (
    <Card className="border-0 rounded-3xl shadow-none overflow-hidden bg-card">
      <CardHeader className="px-5 pt-5 pb-1">
        <CardTitle className="text-lg font-semibold text-foreground">
          Explore More
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {items.map((item, index) => (
          <div key={item.id}>
            {index > 0 && (
              <Separator
                className="bg-border mx-5"
                style={{ width: "calc(100% - 40px)" }}
              />
            )}
            <div className="px-5 py-4">
              <h3 className="text-base font-semibold text-foreground mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-snug mb-2.5">
                {item.description}
              </p>
              <Button
                variant="link"
                asChild
                className="p-0 h-auto min-h-11 text-sm font-semibold hover:no-underline hover:opacity-75 transition-opacity"
                style={{ color: "#C86A44" }}
              >
                <Link href={item.href}>Review →</Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
