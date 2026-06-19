import { redirect } from "next/navigation";

// The credits page was unified into the weekly + extra token system.
export default function AccountCreditsPage() {
  redirect("/tokens");
}
