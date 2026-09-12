import { redirect } from "next/navigation";
/** Retired: admin sign-in is email OTP only. */
export default function AdminAcceptPage() {
  redirect("/admin/login");
}
