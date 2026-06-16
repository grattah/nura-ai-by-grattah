import { redirect } from "next/navigation";
import { ownerExists } from "@/lib/admin/auth";
import { OwnerSignupForm } from "./owner-signup-form";

// One-time owner sign-up. Once an owner exists this is permanently locked and
// only /admin/login remains.
export default async function AdminSignupPage() {
  if (await ownerExists()) redirect("/admin/login");

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <OwnerSignupForm />
    </div>
  );
}
