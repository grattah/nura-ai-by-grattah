import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/admin/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-background md:flex">
      <AdminNav email={identity.email} role={identity.role} />
      <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
