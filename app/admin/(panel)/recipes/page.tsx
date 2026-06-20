import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/admin/auth";
import { canCreate, canEdit, canApprove, canDelete } from "@/lib/admin/roles";
import { Button } from "@/components/ui/button";
import {
  AdminRecipesTable,
} from "@/components/admin/admin-recipes-table";
import type { RecipeListItem } from "@/actions/admin-recipes";

type StatusFilter = "all" | "pending" | "approved";

const TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
];

// Fetch the first two pages up front so page 2 is instant; the client table
// fetches further pages on demand and caches them.
const INITIAL_FETCH = 20;

export default async function AdminRecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: StatusFilter =
    status === "pending" || status === "approved" ? status : "all";

  const identity = await getAdminIdentity();
  const role = identity!.role; // layout guarantees a member

  const admin = createServiceRoleClient();

  const rowsQuery = admin
    .from("recipes")
    .select("id, title, status, display_order, created_at")
    .order("created_at", { ascending: false })
    .range(0, INITIAL_FETCH - 1);
  const countQuery = admin
    .from("recipes")
    .select("id", { count: "exact", head: true });

  if (filter !== "all") {
    rowsQuery.eq("status" as never, filter as never);
    countQuery.eq("status" as never, filter as never);
  }

  const [{ data }, { count }] = await Promise.all([rowsQuery, countQuery]);
  const initialItems = (data as unknown as RecipeListItem[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
        {canCreate(role) && (
          <Button asChild>
            <Link href="/admin/recipes/new">New recipe</Link>
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/recipes${t.key === "all" ? "" : `?status=${t.key}`}`}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
 filter === t.key
 ? "bg-mint-green text-white"
 : "bg-card border border-border text-foreground hover:bg-muted"
 }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <AdminRecipesTable
        key={filter}
        initialItems={initialItems}
        initialHasMore={initialItems.length === INITIAL_FETCH}
        totalCount={count ?? initialItems.length}
        status={filter}
        canEdit={canEdit(role)}
        canApprove={canApprove(role)}
        canDelete={canDelete(role)}
      />
    </div>
  );
}
