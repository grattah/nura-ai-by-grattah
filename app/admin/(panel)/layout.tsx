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
    <div className="h-dvh bg-background relative">
      <AdminNav email={identity.email} role={identity.role} />
      <main className="min-w-0 p-4 md:p-6 md:ml-60 relative min-h-dvh">
        {children}
      </main>
    </div>
  );
}
