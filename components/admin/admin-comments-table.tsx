"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EyeOff, Eye, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
import { setCommentHidden, deleteComment } from "@/actions/admin-comments";
import type { AdminComment } from "@/lib/admin/comments";

/** Long comments would otherwise set the row height for the whole table. */
const PREVIEW_CHARS = 180;

export function AdminCommentsTable({
  comments,
  canModerate,
  canDelete,
}: {
  comments: AdminComment[];
  canModerate: boolean;
  canDelete: boolean;
}) {
  // Optimistic local copy so a hide/restore updates the row immediately; the
  // server action revalidates the page behind it.
  const [rows, setRows] = useState(comments);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleHidden = (row: AdminComment) => {
    setError(null);
    setBusyId(row.id);
    startTransition(async () => {
      const res = await setCommentHidden({ id: row.id, hidden: !row.hidden });
      setBusyId(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRows((prev) =>
        prev.map((c) =>
          c.id === row.id
            ? {
                ...c,
                hidden: !row.hidden,
                hiddenAt: !row.hidden ? new Date().toISOString() : null,
              }
            : c,
        ),
      );
    });
  };

  const remove = (row: AdminComment) => {
    // Deletion is irreversible and cascades to replies, so the confirmation
    // states the actual count rather than a generic "are you sure".
    const extra =
      row.replyCount > 0
        ? `\n\nThis will also delete ${row.replyCount} ${
            row.replyCount === 1 ? "reply" : "replies"
          }.`
        : "";
    if (
      !window.confirm(
        `Permanently delete this comment by ${row.authorName}?${extra}\n\nHiding it instead is reversible.`,
      )
    ) {
      return;
    }

    setError(null);
    setBusyId(row.id);
    startTransition(async () => {
      const res = await deleteComment(row.id);
      setBusyId(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRows((prev) =>
        prev.filter((c) => c.id !== row.id && c.parentId !== row.id),
      );
    });
  };

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-subtle">
        No comments match this view.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-[#DC2323]">{error}</p>}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">Comment</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isLong = row.content.length > PREVIEW_CHARS;
              const open = expanded.has(row.id);
              const busy = busyId === row.id;

              return (
                <TableRow key={row.id} className={row.hidden ? "opacity-60" : ""}>
                  <TableCell className="align-top">
                    <p className="whitespace-pre-wrap text-sm">
                      {isLong && !open
                        ? `${row.content.slice(0, PREVIEW_CHARS)}…`
                        : row.content}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.id)}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-subtle hover:underline"
                      >
                        {open ? (
                          <>
                            <ChevronUp className="size-3" /> Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" /> More
                          </>
                        )}
                      </button>
                    )}
                    <div className="mt-1 flex gap-2 text-xs text-subtle">
                      {row.parentId && <span>reply</span>}
                      {!row.parentId && row.replyCount > 0 && (
                        <span>
                          {row.replyCount}{" "}
                          {row.replyCount === 1 ? "reply" : "replies"}
                        </span>
                      )}
                      {row.likes > 0 && <span>{row.likes} likes</span>}
                    </div>
                  </TableCell>

                  <TableCell className="align-top text-sm">
                    {row.authorName}
                  </TableCell>

                  <TableCell className="align-top text-sm">
                    <Link
                      href={`/recipes/${row.recipeId}`}
                      target="_blank"
                      className="hover:underline"
                    >
                      {row.recipeTitle}
                    </Link>
                  </TableCell>

                  <TableCell className="align-top whitespace-nowrap text-sm text-subtle">
                    {new Date(row.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  <TableCell className="align-top">
                    {row.hidden ? (
                      <Badge variant="destructive">Hidden</Badge>
                    ) : (
                      <Badge variant="secondary">Visible</Badge>
                    )}
                  </TableCell>

                  <TableCell className="align-top text-right">
                    <div className="flex justify-end gap-2">
                      {canModerate && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => toggleHidden(row)}
                        >
                          {row.hidden ? (
                            <>
                              <Eye className="size-4" /> Restore
                            </>
                          ) : (
                            <>
                              <EyeOff className="size-4" /> Hide
                            </>
                          )}
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => remove(row)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
