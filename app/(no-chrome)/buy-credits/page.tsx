import { redirect } from "next/navigation";

// The credits system was unified into the weekly + extra token system.
export default function BuyCreditsPage() {
  redirect("/buy-tokens");
}
