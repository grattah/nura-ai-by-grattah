import { redirect } from "next/navigation";

/**
 * Retired. Admin sign-in is one address (lib/admin/allowlist.ts) with a
 * one-time code, so there is no owner to bootstrap and no password to set.
 */
export default function AdminSignupPage() {
  redirect("/admin/login");
}
