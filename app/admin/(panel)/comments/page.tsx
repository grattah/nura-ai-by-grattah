import Link from "next/link";
import { getAdminIdentity } from "@/lib/admin/auth";
import { canEdit, canDelete } from "@/lib/admin/roles";
import { listComments } from "@/actions/admin-comments";
import {
  COMMENTS_PAGE_SIZE,
  type CommentFilter,
} from "@/lib/admin/comments";
import { AdminCommentsTable } from "@/components/admin/admin-comments-table";

export const dynamic = "force-dynamic";

const TABS: { key: CommentFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" },
];

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const { filter: rawFilter, q, page: rawPage } = await searchParams;
  const filter: CommentFilter =
    rawFilter === "visible" || rawFilter === "hidden" ? rawFilter : "all";
  const page = Math.max(0, Number(rawPage ?? "0") || 0);
  const search = q?.trim() ?? "";

  const [result, identity] = await Promise.all([
    listComments({ filter, search, page }),
    getAdminIdentity(),
  ]);

  if ("error" in result) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Comments</h1>
        <p className="mt-4 text-sm text-[#DC2323]">{result.error}</p>
      </div>
    );
  }

  const role = identity!.role; // the layout guarantees a member
  const { comments, total } = result;
  const lastPage = Math.max(0, Math.ceil(total / COMMENTS_PAGE_SIZE) - 1);

  const href = (over: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("filter", filter);
    if (search) p.set("q", search);
    if (page > 0) p.set("page", String(page));
    for (const [k, v] of Object.entries(over)) {
      if (v === "" || v === 0) p.delete(k);
      else p.set(k, String(v));
    }
    const s = p.toString();
    return `/admin/comments${s ? `?${s}` : ""}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Comments</h1>
        <p className="mt-1 text-sm text-subtle">
          Review what members post on recipes. Hiding removes a comment from the
          app everywhere and can be undone; deleting cannot.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={href({ filter: t.key === "all" ? "" : t.key, page: 0 })}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                filter === t.key
                  ? "bg-mint-green text-white"
                  : "border border-border hover:bg-muted"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* GET form: the search term lives in the URL, so a moderator can share
            or reload a filtered view and land on the same rows. */}
        <form action="/admin/comments" className="flex gap-2">
          {filter !== "all" && (
            <input type="hidden" name="filter" value={filter} />
          )}
          <input
            name="q"
            defaultValue={search}
            placeholder="Search comment text…"
            className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-mint-green"
          />
          <button
            type="submit"
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Search
          </button>
        </form>

        <span className="ml-auto text-sm text-subtle">
          {total} {total === 1 ? "comment" : "comments"}
        </span>
      </div>

      <AdminCommentsTable
        comments={comments}
        canModerate={canEdit(role)}
        canDelete={canDelete(role)}
      />

      {lastPage > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-subtle">
            Page {page + 1} of {lastPage + 1}
          </span>
          <div className="flex gap-2">
            {page > 0 && (
              <Link
                href={href({ page: page - 1 })}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < lastPage && (
              <Link
                href={href({ page: page + 1 })}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}

      {!canEdit(role) && (
        <p className="mt-6 text-sm text-subtle">
          You have read-only access. An editor or above can hide comments; an
          admin can delete them.
        </p>
      )}
    </div>
  );
}
