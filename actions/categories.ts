"use server";
import { createClient } from "@/lib/supabase/server";
import type { Tag } from "@/lib/types";

export const getCategories = async () => {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, display_order")
    .order("display_order");
  return (categories ?? []) as Tag[];
};
