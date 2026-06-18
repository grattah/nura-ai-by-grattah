import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";

async function counts() {
  const admin = createServiceRoleClient();
  const [pending, approved, members] = await Promise.all([
    admin
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("status" as never, "pending" as never),
    admin
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("status" as never, "approved" as never),
    admin
      .from("admin_members" as never)
      .select("user_id", { count: "exact", head: true }),
  ]);
  return {
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    members: members.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const identity = await getAdminIdentity();
  const { pending, approved, members } = await counts();

  const cards = [
    { label: "Pending recipes", value: pending, href: "/admin/recipes?status=pending" },
    { label: "Approved recipes", value: approved, href: "/admin/recipes?status=approved" },
    { label: "Admins", value: members, href: "/admin/members" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground break-words">
          Welcome back{identity?.email ? `, ${identity.email}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-card border border-border rounded-3xl p-5 hover:border-mint-green transition-colors"
          >
            <p className="text-3xl font-semibold text-foreground">{c.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
