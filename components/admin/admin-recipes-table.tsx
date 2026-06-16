"use client";

import { useEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecipeRowActions } from "@/components/admin/recipe-row-actions";
import {
  fetchAdminRecipes,
  type RecipeListItem,
} from "@/actions/admin-recipes";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "pending" | "approved";

export function AdminRecipesTable({
  initialItems,
  initialHasMore,
  totalCount,
  status,
  canEdit,
  canApprove,
  canDelete,
}: {
  initialItems: RecipeListItem[];
  initialHasMore: boolean;
  totalCount: number;
  status: StatusFilter;
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
}) {
  const [items, setItems] = useState<RecipeListItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [count, setCount] = useState(totalCount);
  const [page, setPage] = useState(1);
  const loadingRef = useRef(false);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  // Fetch the next batch (10) if `items` doesn't yet reach `target` rows.
  async function ensureLoaded(target: number) {
    if (loadingRef.current || !hasMore) return;
    if (items.length >= target) return;
    loadingRef.current = true;
    const offset = items.length;
    const res = await fetchAdminRecipes({ offset, limit: PAGE_SIZE, status });
    loadingRef.current = false;
    if ("error" in res) return;
    // Only append if still aligned (guards against races).
    setItems((prev) => (prev.length === offset ? [...prev, ...res.rows] : prev));
    setHasMore(res.hasMore);
  }

  // Whenever the page changes, prefetch the *next* page in the background.
  useEffect(() => {
    ensureLoaded((page + 1) * PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, items.length, hasMore]);

  const start = (page - 1) * PAGE_SIZE;
  const displayed = items.slice(start, start + PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
    setCount((c) => Math.max(0, c - 1));
  }

  function handleStatusChanged(id: string, next: "pending" | "approved") {
    setItems((prev) => {
      // Under a status filter, a row that no longer matches leaves the list.
      if (status !== "all" && next !== status) {
        return prev.filter((r) => r.id !== id);
      }
      return prev.map((r) => (r.id === id ? { ...r, status: next } : r));
    });
    if (status !== "all" && next !== status) setCount((c) => Math.max(0, c - 1));
  }

  // Stepping back off an emptied last page (e.g. after deletes).
  useEffect(() => {
    if (page > 1 && displayed.length === 0) setPage((p) => p - 1);
  }, [displayed.length, page]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-3">Title</TableHead>
              <TableHead className="py-3 w-28">Status</TableHead>
              <TableHead className="py-3 w-24">Order</TableHead>
              <TableHead className="py-3 w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="py-4 font-medium">{r.title}</TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant={r.status === "approved" ? "default" : "secondary"}
                  >
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">{r.display_order}</TableCell>
                <TableCell className="py-4 text-right">
                  <RecipeRowActions
                    id={r.id}
                    status={r.status}
                    canEdit={canEdit}
                    canApprove={canApprove}
                    canDelete={canDelete}
                    onDeleted={handleDeleted}
                    onStatusChanged={handleStatusChanged}
                  />
                </TableCell>
              </TableRow>
            ))}
            {displayed.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-12"
                >
                  No recipes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {count > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
