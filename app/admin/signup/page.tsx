import { redirect } from "next/navigation";

/** Retired: admin sign-in is email OTP only. */
export default function AdminSignupPage() {
  redirect("/admin/login");
}
