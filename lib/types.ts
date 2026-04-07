import { Database } from "./database.types";

export type Tag = Pick<
  Database["public"]["Tables"]["tags"]["Row"],
  "name" | "slug" | "id" | "display_order"
>;
export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
